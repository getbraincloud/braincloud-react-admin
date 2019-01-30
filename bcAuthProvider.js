import {
    AUTH_LOGIN,
    AUTH_LOGOUT,
    AUTH_CHECK,
    AUTH_ERROR,
    AUTH_GET_PERMISSIONS
} from 'react-admin';

export default (bc, verbose = false) => {

    var _bc = bc;
    var _hasLoggedin = false;

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
                    if (verbose) console.log("---> Loged-in to braincloud ", result);
                    if (result.status === 200) {
                        _hasLoggedin = true;
                        if (verbose) console.log("---> User Language code is %s", result.data.languageCode);
                        resolve();
                    } else {
                        reject("Error" + result.status);
                    }
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
                    _bc.restoreSession(r => {
                        if (r.status === 200) {
                            if (verbose) console.log("---> Session restored", r);
                            _hasLoggedin = true;
                            resolve()
                            return;
                        }
                        _hasLoggedin = false;
                        if (verbose) console.log("---> Session expired", r);
                        reject();
                        return
                    });
                })
            } else {
                if (verbose) console.log("---> No Session, just go to loging");
                Promise.reject();
            }
        }
        if (type === AUTH_GET_PERMISSIONS) {
            // if (verbose) console.log("-!-> %s: NOT YET SUPPORTED params: %s ", type, JSON.stringify(params));
            return Promise.resolve();
        }

        if (verbose) console.warn("---> Unknown type %s", type);
        return Promise.resolve();
    }
}