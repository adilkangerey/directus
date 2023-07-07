import { usePermissionsStore } from '@/stores/permissions';
import { useUserStore } from '@/stores/user';
import type { Filter, FieldFilter, Permission } from '@directus/types';
import { generateJoi } from '@directus/utils';

export function isAllowed(
	collection: string,
	action: Permission['action'],
	value: Record<string, any> | null,
	strict = false
): boolean {
	const permissionsStore = usePermissionsStore();
	const userStore = useUserStore();

	if (userStore.isAdmin === true) return true;

	const permissions = permissionsStore.permissions;

	const permissionInfo = permissions.find(
		(permission) => permission.action === action && permission.collection === collection
	);

	if (!permissionInfo) return false;
	if (!permissionInfo.fields && action !== 'share') return false;

	if (strict && action !== 'share' && permissionInfo.fields!.includes('*') === false && value) {
		const allowedFields = permissionInfo.fields;
		const attemptedFields = Object.keys(value);

		if (attemptedFields.every((field) => allowedFields!.includes(field)) === false) return false;
	}

	if (!permissionInfo.permissions || Object.keys(permissionInfo.permissions).length === 0) return true;

	return checkPermissions(permissionInfo.permissions);

	function checkPermissions(permissions: Filter): boolean {
		if (Object.keys(permissions)[0] === '_and') {
			const subPermissions = Object.values(permissions)[0] as FieldFilter[];
			return subPermissions.every((permission) => checkPermissions(permission));
		} else if (Object.keys(permissions)[0] === '_or') {
			const subPermissions = Object.values(permissions)[0] as FieldFilter[];
			return subPermissions.some((permission) => checkPermissions(permission));
		} else {
			const schema = generateJoi(permissions as FieldFilter);

			const { error } = schema.validate(value);
			return error === undefined;
		}
	}
}
