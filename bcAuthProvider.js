import { AUTH_CHECK, AUTH_ERROR, AUTH_GET_PERMISSIONS, AUTH_LOGIN, AUTH_LOGOUT } from 'react-admin';

export default (bc, roleAttribute = "react-admin-role", verbose = false) => {

    var _bc = bc;
    var _hasLoggedin = false;
    var _currentProfile = {};
    var _currentPermission = null;
    var _roleAttribute = roleAttribute;

    function validateLogin(result, resolve, reject) {
        if (verbose) console.log("---> Loged-in to braincloud ", result);
        if (result.status === 200) {
            _hasLoggedin = true;
            if (verbose) console.log("---> User Language code is %s", result.data.languageCode);
            _currentProfile = result.data;
            _bc.playerState.getAttributes(result => {
                var status = result.status;
                if (status === 200) {
                    _currentPermission = result.data.attributes[_roleAttribute];
                    localStorage.setItem(_bc.wrapperName + ".permission", _currentPermission);
                }
                if (verbose) console.log("---> User permission from %s is %s", _roleAttribute, _currentPermission);
                resolve()
            });
        } else {
            reject(result);
        }
    }

    return (type, params) => {
        if (verbose) console.log("---> bcAuthProvider: %s", type);
        if (type === AUTH_LOGIN) {
            const {
                username,
                password,
                mode,
                externalName,
            } = params;

            if (mode === 'External' && typeof externalName === 'undefined') return Promise.reject({ status: 500, message: "Missing externalName parameter" });
            if (verbose) console.log("---> Login", params);
            return new Promise(function (resolve, reject) {
                switch (mode) {
                    case undefined:
                    case 'EmailPassword':
                        _bc.authenticateEmailPassword(username, password, false, result => {
                            validateLogin(result, resolve, reject);
                        });
                        break;
                    case 'External':
                        _bc.authenticateExternal(username, password, externalName, true, result => {
                            validateLogin(result, resolve, reject);
                        });
                        break;
                    case 'Universal':
                        _bc.authenticateUniversal(username, password, false, result => {
                            validateLogin(result, resolve, reject);
                        });
                        break;
                    default:
                        break;
                }
            });
        }
        if (type === AUTH_LOGOUT) {
            _hasLoggedin = false;
            return new Promise(function (resolve, reject) {
                _bc.playerState.logout(result => {
                    if (verbose) console.log("---> _bc.playerState.logout ", result);
                    return resolve();
                });
            })
        }
        if (type === AUTH_ERROR) {
            const status = params.status;
            if (verbose) console.log("---> Checking for AUTH_ERROR: ", status);
            if (status === 401 || status === 403) {
                _hasLoggedin = false;

                return Promise.reject();
            }
            return Promise.resolve();
        }
        if (type === AUTH_CHECK) {
            const hasSessionId = _bc.brainCloudClient.isAuthenticated() || _bc.getSessionId() !== null;
            if (_hasLoggedin && hasSessionId) {
                if (verbose) console.log("---> Already logged-in and authenticated");
                return Promise.resolve()
            }
            if (hasSessionId) {
                return new Promise(function (resolve, reject) {
                    if (verbose) console.log("---> Attempting to restoring Session...");
                    _bc.restoreSession(result => {
                        validateLogin(result, resolve, reject);
                    });
                })
            } else {
                if (verbose) console.log("---> No Session, just go to loging");
                Promise.reject();
            }
        }
        if (type === AUTH_GET_PERMISSIONS) {
            const hasSessionId = _bc.brainCloudClient.isAuthenticated() || _bc.getSessionId() !== null;
            if (hasSessionId) {
                _currentPermission = localStorage.getItem(_bc.wrapperName + ".permission");
                if (verbose) console.log("---> Getting permissions ", _currentPermission);
                return Promise.resolve(_currentPermission);
            } else {
                if (verbose) console.log("---> No permissions available");
                return Promise.reject({ status: 500, status_message: "no permission available" });
            }
        }

        if (verbose) console.warn("---> Unknown type %s", type);
        return Promise.resolve();
    }
}