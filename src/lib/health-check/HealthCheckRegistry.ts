import { createLogger } from "$lib/utils/logger";
import { HealthCheckService, type HealthCheckOptions } from "./services/HealthCheckService";
import type { HealthCheckSnapshot } from "./state/HealthCheckState";
import { writable, type Writable } from "svelte/store";

const logger = createLogger('HealthCheckRegistry');

export class HealthCheckRegistry {
    private services: Map<string, HealthCheckService> = new Map();
    public store: Writable<Record<string, HealthCheckSnapshot>> = writable({});


    /**
     * Register a new health check service
     */
    register(options: HealthCheckOptions): HealthCheckService {
        if (this.services.has(options.serviceName)) {
            logger.warn(`HealthCheckService for ${options.serviceName} already registered. Returning existing instance.`);
            return this.services.get(options.serviceName)!;
        }

        const service = new HealthCheckService(options);
        this.services.set(options.serviceName, service);

        service.subscribe((snapshot) => {
            this.store.update(state => ({
                ...state,
                [options.serviceName]: snapshot
            }));
        });

        logger.info(`Registered HealthCheckService for ${options.serviceName}`);
        return service;
    }

    /**
     * Get a registered health check service by name
     */
    get(serviceName: string): HealthCheckService | undefined {
        return this.services.get(serviceName);
    }

    /**
     * Get the store with health check snapshots
     */
    getStore(): Writable<Record<string, HealthCheckSnapshot>> {
        return this.store;
    }

    /**
     * Start all registered health check services
     */
    startAll(): void {
        logger.info(`Starting all ${this.services.size} registered HealthCheckServices`);
        this.services.forEach(service => service.start());
    }

    /**
     * Stop all registered health check services
     */
    stopAll(): void {
        logger.info(`Stopping all ${this.services.size} registered HealthCheckServices`);
        this.services.forEach(service => service.stop());
    }

    /**
     * Get Overall health status of all API services
     */
    getOverallStatus(): 'healthy' | 'unhealthy' | 'degraded' | 'unknown' {
        const snapshots = Object.values(this.getSnapshots());
        if (snapshots.length === 0) {
            return 'unknown';
        }

        const unhealthyCount = snapshots.filter(s => s.status === 'unhealthy').length;
        const unknownCount = snapshots.filter(s => s.status === 'unknown').length;

        if (unhealthyCount === snapshots.length) {
            return 'unhealthy';
        } else if (unhealthyCount > 0) {
            return 'degraded';
        } else if (unknownCount === snapshots.length) {
            return 'unknown';
        } else if (unknownCount > 0) {
            return 'degraded';
        } else {
            return 'healthy';
        }
    }

    /**
     * get all health check snapshots
     */
    getSnapshots(): Record<string, HealthCheckSnapshot> {
        const result: Record<string, HealthCheckSnapshot> = {};
        this.services.forEach((service, name) => {
            result[name] = service.getSnapshot();
        })
        return result;
    }
}

export const healthCheckRegistry = new HealthCheckRegistry();