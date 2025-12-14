"""
Custom AI Model Training Service
Handles fine-tuning of OpenAI models for organization-specific use cases
"""

import os
import logging
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import openai
from openai import OpenAI
import time

logger = logging.getLogger(__name__)

class CustomTrainingService:
    """Service for training custom AI models using OpenAI fine-tuning"""

    def __init__(self):
        self.client = OpenAI(
            api_key=os.getenv("OPENAI_API_KEY", "sk-dummy-key"),
            base_url=os.getenv("OPENAI_BASE_URL", "http://vllm:8000/v1")
        )

    async def prepare_training_data(
        self,
        examples: List[Dict[str, Any]],
        model_type: str
    ) -> str:
        """
        Prepare training data in JSONL format for OpenAI fine-tuning

        Args:
            examples: List of training examples
            model_type: Type of model (categorization, sentiment, etc.)

        Returns:
            Path to the prepared training file
        """
        try:
            # Format examples based on model type
            formatted_data = []

            for example in examples:
                if model_type == "categorization":
                    formatted_data.append({
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a meeting categorization assistant. Classify meetings into categories."
                            },
                            {
                                "role": "user",
                                "content": f"Categorize this meeting: {example.get('text', '')}"
                            },
                            {
                                "role": "assistant",
                                "content": example.get('category', '')
                            }
                        ]
                    })
                elif model_type == "sentiment":
                    formatted_data.append({
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a sentiment analysis assistant for business meetings."
                            },
                            {
                                "role": "user",
                                "content": f"Analyze sentiment: {example.get('text', '')}"
                            },
                            {
                                "role": "assistant",
                                "content": json.dumps(example.get('sentiment', {}))
                            }
                        ]
                    })
                elif model_type == "summary":
                    formatted_data.append({
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a meeting summarization assistant."
                            },
                            {
                                "role": "user",
                                "content": f"Summarize: {example.get('text', '')}"
                            },
                            {
                                "role": "assistant",
                                "content": example.get('summary', '')
                            }
                        ]
                    })

            # Save to temporary JSONL file
            import tempfile
            temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False)
            for item in formatted_data:
                temp_file.write(json.dumps(item) + '\n')
            temp_file.close()

            logger.info(f"Prepared {len(formatted_data)} training examples in {temp_file.name}")
            return temp_file.name

        except Exception as e:
            logger.error(f"Error preparing training data: {str(e)}")
            raise

    async def upload_training_file(self, file_path: str) -> str:
        """
        Upload training file to OpenAI

        Args:
            file_path: Path to the training file

        Returns:
            File ID from OpenAI
        """
        try:
            with open(file_path, 'rb') as f:
                response = self.client.files.create(
                    file=f,
                    purpose='fine-tune'
                )

            file_id = response.id
            logger.info(f"Uploaded training file with ID: {file_id}")
            return file_id

        except Exception as e:
            logger.error(f"Error uploading training file: {str(e)}")
            raise

    async def create_fine_tune_job(
        self,
        training_file_id: str,
        base_model: str = "gpt-3.5-turbo",
        hyperparameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a fine-tuning job

        Args:
            training_file_id: ID of the uploaded training file
            base_model: Base model to fine-tune
            hyperparameters: Fine-tuning hyperparameters

        Returns:
            Fine-tune job details
        """
        try:
            # Set default hyperparameters
            if hyperparameters is None:
                hyperparameters = {
                    "n_epochs": 3,
                    "batch_size": "auto",
                    "learning_rate_multiplier": "auto"
                }

            # Create fine-tuning job
            job = self.client.fine_tuning.jobs.create(
                training_file=training_file_id,
                model=base_model,
                hyperparameters=hyperparameters
            )

            logger.info(f"Created fine-tune job: {job.id}")

            return {
                "job_id": job.id,
                "status": job.status,
                "created_at": job.created_at,
                "model": base_model,
                "training_file": training_file_id
            }

        except Exception as e:
            logger.error(f"Error creating fine-tune job: {str(e)}")
            raise

    async def check_fine_tune_status(self, job_id: str) -> Dict[str, Any]:
        """
        Check the status of a fine-tuning job

        Args:
            job_id: Fine-tune job ID

        Returns:
            Job status and details
        """
        try:
            job = self.client.fine_tuning.jobs.retrieve(job_id)

            result = {
                "job_id": job.id,
                "status": job.status,
                "created_at": job.created_at,
                "finished_at": job.finished_at,
                "model": job.model,
                "fine_tuned_model": job.fine_tuned_model,
                "trained_tokens": job.trained_tokens,
                "error": job.error.message if job.error else None
            }

            # Get training metrics if available
            if job.status == "succeeded" and job.result_files:
                try:
                    # Retrieve training metrics
                    events = self.client.fine_tuning.jobs.list_events(job_id, limit=10)
                    metrics = []
                    for event in events.data:
                        if hasattr(event, 'data') and event.data:
                            metrics.append({
                                "step": event.data.get("step"),
                                "loss": event.data.get("loss"),
                                "accuracy": event.data.get("accuracy")
                            })
                    result["metrics"] = metrics
                except Exception as e:
                    logger.warning(f"Could not retrieve metrics: {str(e)}")

            return result

        except Exception as e:
            logger.error(f"Error checking fine-tune status: {str(e)}")
            raise

    async def cancel_fine_tune_job(self, job_id: str) -> Dict[str, Any]:
        """
        Cancel a fine-tuning job

        Args:
            job_id: Fine-tune job ID

        Returns:
            Cancellation result
        """
        try:
            job = self.client.fine_tuning.jobs.cancel(job_id)

            return {
                "job_id": job.id,
                "status": job.status,
                "cancelled": True
            }

        except Exception as e:
            logger.error(f"Error cancelling fine-tune job: {str(e)}")
            raise

    async def test_fine_tuned_model(
        self,
        model_id: str,
        test_input: str,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Test a fine-tuned model

        Args:
            model_id: Fine-tuned model ID
            test_input: Test input text
            system_prompt: Optional system prompt

        Returns:
            Model response and metrics
        """
        try:
            messages = []

            if system_prompt:
                messages.append({
                    "role": "system",
                    "content": system_prompt
                })

            messages.append({
                "role": "user",
                "content": test_input
            })

            start_time = time.time()

            response = self.client.chat.completions.create(
                model=model_id,
                messages=messages,
                temperature=0.3,
                max_tokens=500
            )

            inference_time = time.time() - start_time

            return {
                "response": response.choices[0].message.content,
                "model": model_id,
                "inference_time_ms": int(inference_time * 1000),
                "tokens_used": response.usage.total_tokens if response.usage else 0,
                "finish_reason": response.choices[0].finish_reason
            }

        except Exception as e:
            logger.error(f"Error testing fine-tuned model: {str(e)}")
            raise

    async def evaluate_model_performance(
        self,
        model_id: str,
        test_examples: List[Dict[str, Any]],
        model_type: str
    ) -> Dict[str, Any]:
        """
        Evaluate model performance on test set

        Args:
            model_id: Fine-tuned model ID
            test_examples: List of test examples
            model_type: Type of model

        Returns:
            Performance metrics
        """
        try:
            correct = 0
            total = len(test_examples)
            results = []

            for example in test_examples:
                test_result = await self.test_fine_tuned_model(
                    model_id,
                    example.get('text', ''),
                    None
                )

                predicted = test_result['response']
                actual = example.get('category' if model_type == 'categorization' else 'output', '')

                is_correct = self._compare_outputs(predicted, actual, model_type)
                if is_correct:
                    correct += 1

                results.append({
                    "input": example.get('text', '')[:100],
                    "predicted": predicted,
                    "actual": actual,
                    "correct": is_correct
                })

            accuracy = correct / total if total > 0 else 0

            return {
                "accuracy": accuracy,
                "precision": accuracy,  # Simplified for now
                "recall": accuracy,     # Simplified for now
                "f1_score": accuracy,   # Simplified for now
                "total_examples": total,
                "correct_predictions": correct,
                "sample_results": results[:5]
            }

        except Exception as e:
            logger.error(f"Error evaluating model: {str(e)}")
            raise

    def _compare_outputs(self, predicted: str, actual: str, model_type: str) -> bool:
        """Compare predicted and actual outputs"""
        # Simple comparison - can be enhanced based on model type
        if model_type == "categorization":
            return predicted.lower().strip() == actual.lower().strip()
        else:
            # For other types, use similarity threshold
            from difflib import SequenceMatcher
            similarity = SequenceMatcher(None, predicted.lower(), actual.lower()).ratio()
            return similarity > 0.7

    async def delete_fine_tuned_model(self, model_id: str) -> Dict[str, Any]:
        """
        Delete a fine-tuned model

        Args:
            model_id: Fine-tuned model ID

        Returns:
            Deletion result
        """
        try:
            response = self.client.models.delete(model_id)

            return {
                "model_id": model_id,
                "deleted": response.deleted
            }

        except Exception as e:
            logger.error(f"Error deleting model: {str(e)}")
            raise
