#!/usr/bin/env node

/**
 * Systematic Violation Fix Tracker
 * Monitors progress and updates TODO checklist automatically
 */

const fs = require('fs');
const path = require('path');

class ViolationFixTracker {
  constructor() {
    this.todoFilePath = path.join(process.cwd(), '.validation', 'SYSTEMATIC_VIOLATION_FIX_TODO.md');
    this.progressFile = path.join(process.cwd(), '.validation', 'PROGRESS_TRACKING.json');
    this.startTime = new Date();
  }

  async initializeTracking() {
    console.log('🎯 Initializing Systematic Violation Fix Tracking...\n');
    
    // Create initial progress tracking file
    const initialProgress = {
      startDate: this.startTime.toISOString(),
      totalViolations: 2550,
      totalWarnings: 2858,
      phases: {
        'Phase 1A': { total: 7, completed: 0, status: 'pending' },
        'Phase 1B': { total: 2, completed: 0, status: 'pending' }, 
        'Phase 1C': { total: 1, completed: 0, status: 'pending' },
        'Phase 1D': { total: 1, completed: 0, status: 'pending' },
        'Phase 1E': { total: 2, completed: 0, status: 'pending' },
        'Phase 2': { total: 3, completed: 0, status: 'pending' },
        'Phase 3': { total: 3, completed: 0, status: 'pending' }
      },
      completedTasks: [],
      currentPhase: 'Phase 1A',
      qualityScore: 0.0,
      lastUpdated: this.startTime.toISOString()
    };

    fs.writeFileSync(this.progressFile, JSON.stringify(initialProgress, null, 2));
    console.log('✅ Progress tracking initialized');
    console.log(`📊 Total issues to fix: ${initialProgress.totalViolations + initialProgress.totalWarnings}`);
    console.log(`🎯 Current focus: ${initialProgress.currentPhase}\n`);
  }

  async markTaskComplete(taskId, description) {
    const progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
    
    // Add to completed tasks
    progress.completedTasks.push({
      id: taskId,
      description: description,
      completedAt: new Date().toISOString(),
      timeElapsed: this.getTimeElapsed()
    });

    // Update phase progress
    const phase = this.getPhaseFromTaskId(taskId);
    if (progress.phases[phase]) {
      progress.phases[phase].completed++;
      
      // Mark phase as complete if all tasks done
      if (progress.phases[phase].completed >= progress.phases[phase].total) {
        progress.phases[phase].status = 'completed';
        console.log(`🎉 ${phase} COMPLETED!`);
        
        // Move to next phase
        const nextPhase = this.getNextPhase(phase);
        if (nextPhase) {
          progress.currentPhase = nextPhase;
          progress.phases[nextPhase].status = 'active';
          console.log(`➡️  Moving to ${nextPhase}`);
        }
      }
    }

    progress.lastUpdated = new Date().toISOString(); 
    fs.writeFileSync(this.progressFile, JSON.stringify(progress, null, 2));

    // Update TODO markdown file
    await this.updateTodoFile(taskId);
    
    console.log(`✅ Task ${taskId} marked complete: ${description}`);
    this.showProgress();
  }

  async updateTodoFile(completedTaskId) {
    let todoContent = fs.readFileSync(this.todoFilePath, 'utf8');
    
    // Find and update the specific task
    const taskPattern = new RegExp(
      `(- \\[ \\] \\*\\*Task ${completedTaskId}\\*\\*:.*?)\\*\\*Status\\*\\*: ⏳ PENDING`,
      'gms'
    );
    
    todoContent = todoContent.replace(taskPattern, 
      `$1**Status**: ✅ COMPLETED (${new Date().toISOString().split('T')[0]})`
    );

    // Update overall status if needed
    const progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
    const totalCompleted = progress.completedTasks.length;
    const totalTasks = Object.values(progress.phases).reduce((sum, phase) => sum + phase.total, 0);
    
    if (totalCompleted === totalTasks) {
      todoContent = todoContent.replace(
        '**Status:** 🔴 IN PROGRESS',
        '**Status:** ✅ COMPLETED'
      );
    }

    fs.writeFileSync(this.todoFilePath, todoContent);
  }

  getPhaseFromTaskId(taskId) {
    // Map task IDs to phases
    const phaseMap = {
      '1.1': 'Phase 1A', '1.2': 'Phase 1A', '1.3': 'Phase 1A',
      '1.4': 'Phase 1B', '1.5': 'Phase 1B', 
      '1.6': 'Phase 1C',
      '1.7': 'Phase 1D',
      '1.8': 'Phase 1E', '1.9': 'Phase 1E', '1.10': 'Phase 1E',
      '2.1': 'Phase 2', '2.2': 'Phase 2', '2.3': 'Phase 2',
      '3.1': 'Phase 3', '3.2': 'Phase 3', '3.3': 'Phase 3'
    };
    return phaseMap[taskId] || 'Unknown';
  }

  getNextPhase(currentPhase) {
    const phases = ['Phase 1A', 'Phase 1B', 'Phase 1C', 'Phase 1D', 'Phase 1E', 'Phase 2', 'Phase 3'];
    const currentIndex = phases.indexOf(currentPhase);
    return currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;
  }

  showProgress() {
    const progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
    
    console.log('\n📊 PROGRESS DASHBOARD');
    console.log('====================');
    
    const totalTasks = Object.values(progress.phases).reduce((sum, phase) => sum + phase.total, 0);
    const completedTasks = progress.completedTasks.length;
    const progressPercent = ((completedTasks / totalTasks) * 100).toFixed(1);
    
    console.log(`Overall Progress: ${completedTasks}/${totalTasks} tasks (${progressPercent}%)`);
    console.log(`Current Phase: ${progress.currentPhase}`);
    console.log(`Time Elapsed: ${this.getTimeElapsed()}`);
    
    console.log('\nPhase Breakdown:');
    for (const [phase, data] of Object.entries(progress.phases)) {
      const status = data.status === 'completed' ? '✅' : 
                    data.status === 'active' ? '🔄' : '⏳';
      console.log(`  ${status} ${phase}: ${data.completed}/${data.total} tasks`);
    }
    
    if (progress.completedTasks.length > 0) {
      console.log('\nRecent Completions:');
      progress.completedTasks.slice(-3).forEach(task => {
        console.log(`  ✅ ${task.id}: ${task.description.substring(0, 50)}...`);
      });
    }
    
    console.log('\n');
  }

  getTimeElapsed() {
    const now = new Date();
    const elapsed = now - this.startTime;
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  async runQualityCheck() {
    console.log('🔍 Running quality detector to check current violations...\n');
    
    const { spawn } = require('child_process');
    const detector = spawn('node', ['.validation/VIOLATION-DETECTOR-SCRIPTS/enhanced-quality-detector.cjs'], {
      stdio: 'inherit'
    });

    return new Promise((resolve) => {
      detector.on('close', (code) => {
        console.log(`\n Quality check completed with code ${code}`);
        resolve(code);
      });
    });
  }

  async generateNextActionPlan() {
    const progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
    
    console.log('\n🎯 NEXT ACTION PLAN');
    console.log('==================');
    
    const currentPhase = progress.currentPhase;
    const phaseData = progress.phases[currentPhase];
    
    if (phaseData && phaseData.status !== 'completed') {
      console.log(`Current Focus: ${currentPhase}`);
      console.log(`Progress: ${phaseData.completed}/${phaseData.total} tasks completed`);
      
      // Get next task to work on
      const nextTaskId = this.getNextTaskId(currentPhase, phaseData.completed);
      if (nextTaskId) {
        console.log(`\n➡️  Next Task: ${nextTaskId}`);
        console.log(`📋 Checklist: .validation/SYSTEMATIC_VIOLATION_FIX_TODO.md`);
        console.log(`🎯 Mark complete with: node .validation/fix-tracker.js complete ${nextTaskId} "description"`);
      }
    } else {
      console.log('🎉 All tasks completed! Running final validation...');
      await this.runQualityCheck();
    }
  }

  getNextTaskId(phase, completed) {
    const taskMap = {
      'Phase 1A': ['1.1', '1.2', '1.3'],
      'Phase 1B': ['1.4', '1.5'],
      'Phase 1C': ['1.6'],
      'Phase 1D': ['1.7'],
      'Phase 1E': ['1.8', '1.9', '1.10'],
      'Phase 2': ['2.1', '2.2', '2.3'],
      'Phase 3': ['3.1', '3.2', '3.3']
    };
    
    const tasks = taskMap[phase] || [];
    return tasks[completed] || null;
  }
}

// CLI Interface
async function main() {
  const tracker = new ViolationFixTracker();
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('🎯 Systematic Violation Fix Tracker');
    console.log('Usage:');
    console.log('  node fix-tracker.js init              - Initialize tracking');
    console.log('  node fix-tracker.js status             - Show current progress');
    console.log('  node fix-tracker.js complete <id> <desc> - Mark task complete');
    console.log('  node fix-tracker.js next               - Show next action plan');
    console.log('  node fix-tracker.js check              - Run quality detector');
    return;
  }

  const command = args[0];
  
  switch (command) {
    case 'init':
      await tracker.initializeTracking();
      await tracker.generateNextActionPlan();
      break;
      
    case 'status':
      tracker.showProgress();
      break;
      
    case 'complete':
      const taskId = args[1];
      const description = args.slice(2).join(' ') || 'Task completed';
      if (!taskId) {
        console.error('❌ Task ID required');
        return;
      }
      await tracker.markTaskComplete(taskId, description);
      await tracker.generateNextActionPlan();
      break;
      
    case 'next':
      await tracker.generateNextActionPlan();
      break;
      
    case 'check':
      await tracker.runQualityCheck();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Tracker failed:', error);
    process.exit(1);
  });
}

module.exports = ViolationFixTracker;
