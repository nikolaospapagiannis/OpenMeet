/**
 * Distributed Tracing with OpenTelemetry
 * Provides end-to-end request tracing across services
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import {
  trace,
  context,
  SpanStatusCode,
  Span,
  Tracer,
  Context,
} from '@opentelemetry/api';
import { logger } from './logger';

// Conditional imports for potentially missing modules
let Resource: any;
let SemanticResourceAttributes: any;

try {
  const resources = require('@opentelemetry/resources');
  Resource = resources.Resource;
} catch {
  Resource = class { constructor() {} };
}

try {
  const semanticConventions = require('@opentelemetry/semantic-conventions');
  SemanticResourceAttributes = semanticConventions.SemanticResourceAttributes || semanticConventions.SEMRESATTRS_SERVICE_NAME && {
    SERVICE_NAME: semanticConventions.SEMRESATTRS_SERVICE_NAME,
    SERVICE_VERSION: semanticConventions.SEMRESATTRS_SERVICE_VERSION,
    DEPLOYMENT_ENVIRONMENT: semanticConventions.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  };
} catch {
  SemanticResourceAttributes = {
    SERVICE_NAME: 'service.name',
    SERVICE_VERSION: 'service.version',
    DEPLOYMENT_ENVIRONMENT: 'deployment.environment',
  };
}

let sdk: NodeSDK | null = null;
let tracer: Tracer;

/**
 * Initialize OpenTelemetry tracing
 */
export function initializeTracing(): NodeSDK | null {
  // Only initialize in production or if explicitly enabled
  const tracingEnabled = process.env.ENABLE_TRACING === 'true' || process.env.NODE_ENV === 'production';

  if (!tracingEnabled) {
    logger.info('Distributed tracing disabled');
    return null;
  }

  try {
    const serviceName = process.env.SERVICE_NAME || 'openmeet-api';
    const exporterType = process.env.TRACING_EXPORTER || 'jaeger'; // jaeger, zipkin, or console

    let exporter;

    switch (exporterType) {
      case 'zipkin':
        exporter = new ZipkinExporter({
          url: process.env.ZIPKIN_URL || 'http://localhost:9411/api/v2/spans',
        });
        break;

      case 'jaeger':
      default:
        exporter = new JaegerExporter({
          endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
          // AgentHost and port for UDP transport
          // host: process.env.JAEGER_AGENT_HOST || 'localhost',
          // port: Number(process.env.JAEGER_AGENT_PORT) || 6832,
        });
        break;
    }

    sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '1.0.0',
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
      }),
      traceExporter: exporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Customize instrumentation
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable fs tracing (too verbose)
          },
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            requestHook: (span, request) => {
              // Add custom attributes to HTTP spans
              span.setAttribute('http.request_id', (request as any).requestId);
            },
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true,
          },
        }),
      ],
    });

    sdk.start();

    // Get tracer
    tracer = trace.getTracer(serviceName, process.env.APP_VERSION || '1.0.0');

    logger.info('Distributed tracing initialized', {
      serviceName,
      exporterType,
      endpoint: process.env.JAEGER_ENDPOINT || process.env.ZIPKIN_URL,
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      sdk?.shutdown()
        .then(() => logger.info('Tracing terminated'))
        .catch((error) => logger.error('Error terminating tracing', { error: error.message }));
    });

    return sdk;
  } catch (error: any) {
    logger.error('Failed to initialize tracing', {
      error: error.message,
      stack: error.stack,
    });
    return null;
  }
}

/**
 * Get the active tracer
 */
export function getTracer(): Tracer {
  if (!tracer) {
    // Return no-op tracer if not initialized
    tracer = trace.getTracer('noop-tracer');
  }
  return tracer;
}

/**
 * Create a new span for an operation
 */
export function startSpan(name: string, options?: any): Span {
  return getTracer().startSpan(name, options);
}

/**
 * Trace a function execution
 */
export async function traceFunction<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  const span = startSpan(spanName);

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }

  try {
    const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error: any) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Trace a synchronous function
 */
export function traceFunctionSync<T>(
  spanName: string,
  fn: (span: Span) => T,
  attributes?: Record<string, any>
): T {
  const span = startSpan(spanName);

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }

  try {
    const result = context.with(trace.setSpan(context.active(), span), () => fn(span));
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error: any) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add event to current span
 */
export function addSpanEvent(name: string, attributes?: Record<string, any>): void {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    activeSpan.addEvent(name, attributes);
  }
}

/**
 * Set span attributes
 */
export function setSpanAttributes(attributes: Record<string, any>): void {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    Object.entries(attributes).forEach(([key, value]) => {
      activeSpan.setAttribute(key, value);
    });
  }
}

/**
 * Get trace ID from current context
 */
export function getTraceId(): string | undefined {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    return activeSpan.spanContext().traceId;
  }
  return undefined;
}

/**
 * Get span ID from current context
 */
export function getSpanId(): string | undefined {
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    return activeSpan.spanContext().spanId;
  }
  return undefined;
}

/**
 * Decorator for tracing class methods
 */
export function Trace(spanName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = spanName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return traceFunction(name, async (span) => {
        span.setAttribute('method', propertyKey);
        span.setAttribute('class', target.constructor.name);
        return originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

/**
 * Middleware to add trace context to requests
 */
export function tracingMiddleware() {
  return (req: any, res: any, next: any) => {
    const traceId = getTraceId();
    const spanId = getSpanId();

    if (traceId) {
      req.traceId = traceId;
      req.spanId = spanId;
      res.setHeader('X-Trace-ID', traceId);

      // Add to logger if available
      if (req.logger) {
        req.logger = req.logger.child({ traceId, spanId });
      }
    }

    next();
  };
}

export default {
  initializeTracing,
  getTracer,
  startSpan,
  traceFunction,
  traceFunctionSync,
  addSpanEvent,
  setSpanAttributes,
  getTraceId,
  getSpanId,
  Trace,
  tracingMiddleware,
};
