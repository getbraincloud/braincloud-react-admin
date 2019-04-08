import {
    AUTH_LOGIN,
    AUTH_LOGOUT,
    AUTH_CHECK,
    AUTH_ERROR,
    AUTH_GET_PERMISSIONS
} from 'react-admin';

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
                    localStorage.setItem(_bc.wrapperName+".permission",_currentPermission);
                }
                if (verbose) console.log("---> User permission from %s is %s",_roleAttribute, _currentPermission);                
                resolve()
            });
        } else {
            reject("Error" + result.status);
        }
    }

    return (type, params) => {
        if (verbose) console.log("---> bcAuthProvider: %s", type);

        if (type === AUTH_LOGIN) {
            const {
                username,
                password
            } = params;
            if (verbose) console.log("---> Login", params);
            return new Promise(function (resolve, reject) {
                _bc.authenticateEmailPassword(username, password, false, result => {
                    validateLogin(result,resolve,reject);
                });
            });
        }
        if (type === AUTH_LOGOUT) {
            _hasLoggedin = false;
            return Promise.resolve();
        }
        if (type === AUTH_ERROR) {
            const status = params.status;
            if (verbose) console.log("---> Checking for AUTH_ERROR: %d", status);
            if (status === 401 || status === 403) {
                _hasLoggedin = false;

                return Promise.reject();
            }
            return Promise.resolve();
        }
        if (type === AUTH_CHECK) {
            const hasSessionId = _bc.brainCloudClient.isAuthenticated() || window.localStorage.getItem(_bc.wrapperName +".sessionId") !== null;
            if (verbose) console.log("---> _bc.brainCloudClient.isAuthenticated() = %s",hasSessionId);
            if (_hasLoggedin && hasSessionId) {
                if (verbose) console.log("---> Already logged-in and authenticated");
                return Promise.resolve()
            }
            if (hasSessionId) {
                return new Promise(function (resolve, reject) {
                    if (verbose) console.log("---> Attempting to restoring Session...");
                    _bc.restoreSession(result => {
                        validateLogin(result,resolve,reject);
                    });
                })
            } else {
                if (verbose) console.log("---> No Session, just go to loging");
                Promise.reject();
            }
        }
        if (type === AUTH_GET_PERMISSIONS) {
            _currentPermission = localStorage.getItem(_bc.wrapperName+".permission");
            if (verbose) console.log("---> Getting permission %s",_currentPermission);
            return Promise.resolve(_currentPermission);
        }

        if (verbose) console.warn("---> Unknown type %s", type);
        return Promise.resolve();
    }
}