import type { DirectusPermission } from '../../../schema/permission.js';
import type { ApplyQueryFields, Query } from '../../../types/index.js';
import type { RestCommand } from '../../types.js';
import { queryToParams } from '../../utils/query-to-params.js';

export type CreatePermissionOutput<
	Schema extends object,
	TQuery extends Query<Schema, Item>,
	Item = DirectusPermission<Schema>
> = ApplyQueryFields<Schema, Item, TQuery['fields']>;

/**
 * Create multiple new permission rules
 *
 * @param items The permission rules to create
 * @param query Optional return data query
 *
 * @returns Returns the permission objects for the created permissions.
 */
export const createPermissions =
	<Schema extends object, TQuery extends Query<Schema, DirectusPermission<Schema>>>(
		items: Partial<DirectusPermission<Schema>>[],
		query?: TQuery
	): RestCommand<CreatePermissionOutput<Schema, TQuery>[], Schema> =>
	() => ({
		path: `/permissions`,
		params: queryToParams(query ?? {}),
		body: JSON.stringify(items),
		method: 'POST',
	});

/**
 * Create a new permission rule
 *
 * @param item The permission rule to create
 * @param query Optional return data query
 *
 * @returns Returns the permission object for the created permission.
 */
export const createPermission =
	<Schema extends object, TQuery extends Query<Schema, DirectusPermission<Schema>>>(
		item: Partial<DirectusPermission<Schema>>,
		query?: TQuery
	): RestCommand<CreatePermissionOutput<Schema, TQuery>, Schema> =>
	() => ({
		path: `/permissions`,
		params: queryToParams(query ?? {}),
		body: JSON.stringify(item),
		method: 'POST',
	});
