import useUserStore from '@/stores/modules/user'

function authPermission(permission: string[]) {
  const all_permission = '*:*:*'
  const permissions: string[] = useUserStore().permissions
  if (permission && permission.length > 0) {
    return permissions.some((v: any) => {
      return all_permission === v || v === permission
    })
  } else {
    return false
  }
}

function authRole(role: any) {
  const super_admin = 'admin'
  const roles = useUserStore().roles
  if (role && role.length > 0) {
    return roles.some((v: any) => {
      return super_admin === v || v === role
    })
  } else {
    return false
  }
}

export default {
  /**
   * 验证用户是否具备某权限
   * @param permission
   * @returns
   */
  hasPermi(permission: string[]) {
    return authPermission(permission)
  },

  /**
   * 验证用户是否含有指定权限，只需包含其中一个
   * @param permissions
   * @returns
   */
  hasPermissionOr(permissions: any) {
    return permissions.some((item: any) => {
      return authPermission(item)
    })
  },

  /**
   * 验证用户是否含有指定权限，必须全部拥有
   * @param permissions
   * @returns
   */
  hasPermissionAnd(permissions: any) {
    return permissions.every((item: any) => {
      return authPermission(item)
    })
  },

  /**
   * 验证用户是否具备某角色
   * @param role
   * @returns
   */
  hasRole(role: any) {
    return authRole(role)
  },

  /**
   * 验证用户是否含有指定角色，只需包含其中一个
   * @param roles
   * @returns
   */
  hasRoleOr(roles: any) {
    return roles.some((item: any) => {
      return authRole(item)
    })
  },

  /**
   * 验证用户是否含有指定角色，必须全部拥有
   * @param roles
   * @returns
   */
  hasRoleAnd(roles: any) {
    return roles.every((item: any) => {
      return authRole(item)
    })
  },
}
