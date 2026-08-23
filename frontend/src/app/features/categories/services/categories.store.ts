import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiError } from '../../../core/models/api-error.model';
import { NotificationService } from '../../../core/services/notification.service';
import {
  CreateCategoryPayload,
  ManagedCategory,
  UpdateCategoryPayload,
} from '../models/category.model';
import { CategoriesManagementApiService } from './categories-api.service';

@Injectable()
export class CategoriesStore {
  private readonly categoriesApi = inject(CategoriesManagementApiService);
  private readonly notifications = inject(NotificationService);
  private readonly categoriesState = signal<readonly ManagedCategory[]>([]);
  private readonly loadingState = signal(false);
  private readonly savingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly categories = this.categoriesState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly saving = this.savingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly activeCount = computed(
    () => this.categoriesState().filter((category) => category.isActive).length,
  );
  readonly inactiveCount = computed(() => this.categoriesState().length - this.activeCount());

  async load(): Promise<void> {
    this.loadingState.set(true);
    this.errorState.set(null);

    try {
      this.categoriesState.set(await firstValueFrom(this.categoriesApi.list()));
    } catch (error: unknown) {
      this.errorState.set(messageFromError(error));
    } finally {
      this.loadingState.set(false);
    }
  }

  async create(payload: CreateCategoryPayload): Promise<boolean> {
    return this.executeMutation(
      () => firstValueFrom(this.categoriesApi.create(payload)),
      'Categoría creada correctamente.',
    );
  }

  async update(id: number, payload: UpdateCategoryPayload): Promise<boolean> {
    return this.executeMutation(
      () => firstValueFrom(this.categoriesApi.update(id, payload)),
      'Categoría actualizada correctamente.',
    );
  }

  async deactivate(id: number): Promise<boolean> {
    this.savingState.set(true);

    try {
      await firstValueFrom(this.categoriesApi.delete(id));
      await this.load();
      this.notifications.success('Categoría desactivada correctamente.');
      return true;
    } catch (error: unknown) {
      this.notifications.error(messageFromError(error));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }

  private async executeMutation(
    request: () => Promise<ManagedCategory>,
    successMessage: string,
  ): Promise<boolean> {
    this.savingState.set(true);

    try {
      await request();
      await this.load();
      this.notifications.success(successMessage);
      return true;
    } catch (error: unknown) {
      this.notifications.error(messageFromError(error));
      return false;
    } finally {
      this.savingState.set(false);
    }
  }
}

function messageFromError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'La operación de categorías no pudo completarse.';
}
