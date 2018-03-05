import { ROLES } from '../constants';
import { can } from './utils';

/**
 * Checks whether user is logged in or not
 * @param {Object} user - User object
 * @throws {Exception} throws Error('Login required')
 * @return {null}
 */
export const checkLogin = user => {
  if (!user) {
    throw new Error('Login required');
  }
};

/**
 * Checks if user is logged and if user is admin
 * @param {Object} user - User object
 * @throws {Exception} throws Error('Permission required')
 * @return {null}
 */
export const checkAdmin = user => {
  if (!user.isOwner && user.role !== ROLES.ADMIN) {
    throw new Error('Permission required');
  }
};

/**
 * Wraps object property (function) with permission checkers
 * @param {Object} cls - Object
 * @param {string} methodName - name of the property (method) of the object
 * @param {function[]} checkers - List of permission checkers
 * @return {function} returns wrapped method
 */
export const permissionWrapper = (cls, methodName, checkers) => {
  const oldMethod = cls[methodName];

  cls[methodName] = (root, args, { user }) => {
    for (let checker of checkers) {
      checker(user);
    }

    return oldMethod(root, args, { user });
  };
};

/**
 * Wraps a method with 'Login required' permission checker
 * @param {Object} cls - Object
 * @param {string} methodName - name of the property (method) of the object
 * @return {function} returns wrapped method
 */
export const requireLogin = (cls, methodName) => permissionWrapper(cls, methodName, [checkLogin]);

/**
 * Wraps a method with 'Permission required' permission checker
 * @param {Object} cls - Object
 * @param {string} methodName - name of the property (method) of the object
 * @return {function} returns wrapped method
 */
export const requireAdmin = (cls, methodName) =>
  permissionWrapper(cls, methodName, [checkLogin, checkAdmin]);

/**
 * Wraps all properties (methods) of a given object with 'Login required' permission checker
 * @param {Object} cls - Object
 * @param {string} methodName - name of the property (method) of the object
 * @return {function} returns wrapped method
 */
export const moduleRequireLogin = mdl => {
  for (let method in mdl) {
    requireLogin(mdl, method);
  }
};

/**
 * Wraps all properties (methods) of a given object with 'Permission required' permission checker
 * @param {Object} cls - Object
 * @param {string} methodName - name of the property (method) of the object
 * @return {function} returns wrapped method
 */
export const moduleRequireAdmin = mdl => {
  for (let method in mdl) {
    requireAdmin(mdl, method);
  }
};

/**
 * Checks if user is logged and if user is can action
 * @param {Object} user - User object
 * @throws {Exception} throws Error('Permission required')
 * @return {null}
 */
export const checkPermission = async (cls, methodName, actionName) => {
  const oldMethod = cls[methodName];

  cls[methodName] = async (root, args, { user }) => {
    checkLogin(user);

    const allowed = await can(actionName, user._id);

    if (!allowed) throw new Error('Permission required');

    return oldMethod(root, args, { user });
  };
};

export default {
  requireLogin,
  requireAdmin,
  moduleRequireLogin,
  moduleRequireAdmin,
  checkPermission,
};
