// in bcDataProvider.js
import {
    GET_LIST,
    GET_ONE,
    CREATE,
    UPDATE,
    DELETE,
    GET_MANY,
    DELETE_MANY,
    UPDATE_MANY,
    GET_MANY_REFERENCE,
} from 'react-admin';


/* Conventions:
in brainCloud data is returned as a property of an entity object like:
    { entityId: "f247c6c0-ba3e-446b-ba37-f3c393d2ed81",
      ownerId: "d247c6c0-ba3e-446b-ba37-f3c393d2ed83",
      entityType: "MyTestType",
      version: 1,
      ...
      data: {
          name: "Bruce Wayne",
          city: "Gotham",
          ...
        }
    }
    we'll use the therm `entity' for this format

    to work with React-Admin the data will be converted to/from: 
    
    { 
        id: "f247c6c0-ba3e-446b-ba37-f3c393d2ed81",  // from _entity.entityId
        name: "Bruce Wayne",
        city: "Gotham",
        ...
        _entity: {
            entityId: "f247c6c0-ba3e-446b-ba37-f3c393d2ed81",
            ownerId: "d247c6c0-ba3e-446b-ba37-f3c393d2ed83",
            entityType: "MyTestType",
            version: 1,
            ...
        }
    }

    we'll use the therm `raEntity' for this format
*/


/**
 * Maps react-admin queries to my REST API
 *
 * @param {string} type Request type, e.g GET_LIST
 * @param {string} resource Resource name, e.g. "posts"
 * @param {Object} payload Request parameters. Depends on the request type
 * @returns {Promise} the Promise for a data response
 */
export default (bc, indexedIdResources = [], verbose = false) => {

    var _bc = bc;

    const validEntitySortFields = ["ownerId", "entityType", "entityIndexedId", "timeToLive", "createdAt", "updatedAt"];

    const globalService = {
        ..._bc.globalEntity,
        create: (type, ttl, acl, data, completion) => { _bc.globalEntity.createEntity(type, ttl, acl, data, completion) },
        update: (id, type, data, acl, version, completion) => { _bc.globalEntity.updateEntity(id, version, data, completion) },
        read: (id, completion) => { _bc.globalEntity.readEntity(id, completion) }
    };
    const userService = {
        ..._bc.entity,
        create: (type, ttl, acl, data, completion) => { _bc.entity.createEntity(type, data, acl, completion) },
        update: (id, type, data, acl, version, completion) => { _bc.entity.updateEntity(id, type, data, acl, version, completion) },
        read: (id, completion) => { _bc.entity.getEntity(id, completion) },
        createEntityWithIndexedId: (resource, indexedId, ttl, acl, data, completion) => { _bc.entity.createEntity(type, data, acl, completion) }
    };


    // entity Marshaling 
    function entityToRaEntity(entity) {
        var { data, ..._entity } = entity;
        var raEntity = { _entity: _entity, ...data };

        if (indexedIdResources.includes(entity.entityType)) {
            raEntity.id = entity.entityIndexedId;
        } else {
            raEntity.id = entity.entityId;
        }
        return raEntity;
    }

    function entitiesToData(entities, useIndexId = false) {
        var raEntities = [];
        if (entities) {
            var arr = entities
            raEntities = arr.map(entity => {
                var item = entityToRaEntity(entity);
                return item;
            })
        }
        return raEntities;
    };

    function dataToEntity(data) {
        var entity = data._entity;
        data._entity = undefined;
        entity.data = data;

        return entity;
    }

    function genSortCriteria(params, resource) {
        var sortField = params.sort.field;

        // id is an alias to _entity.entityId
        if (sortField === "id") sortField = indexedIdResources.includes(resource) ? "_entity.entityIndexedId" : "_entity.entityId";

        // unwrap entity fields.
        if (sortField.startsWith("_entity")) {
            sortField = sortField.substring(8);
            if (!validEntitySortFields.includes(sortField)) {
                sortField = null;
            }
        } else {
            sortField = "data." + sortField;
        }
        var sortCriteria = {}
        if (sortField !== null)
            sortCriteria[sortField] = params.sort.order === "ASC" ? 1 : -1;
        return sortCriteria;
    }

    function genFilterCriteria(filter, resource) {
        var filterCriteria = {};
        for (var field in filter) {

            if (filter.hasOwnProperty(field)) {
                var element = filter[field];
                var entityField = field;
                if (entityField === "id") entityField = indexedIdResources.includes(resource) ? "_entity.entityIndexedId" : "_entity.entityId";

                if (entityField.startsWith("_entity")) {
                    entityField = entityField.substring(8);
                } else if (entityField.startsWith("$")) {// this is a mongo query string.
                    // Process it's childs recursively
                    if (typeof element === 'object') {
                        if (Array.isArray(element))
                            element = element.map(item => genFilterCriteria(item, resource));
                        else
                            element = genFilterCriteria(element, resource);
                    }
                } else {
                    entityField = "data." + entityField;
                }
                // special case to provide wildcard searches
                if (typeof element === 'string' && element.startsWith("$regex:")) {
                    element = { '$regex': element.split(':')[1] };
                }
                filterCriteria[entityField] = element;
            }
        }

        return filterCriteria;
    }
    function processCreateReply(result, resolve, reject) {
        if (result.status === 200) {
            const raEntity = entityToRaEntity(result.data);
            resolve({
                data: raEntity
            });
        } else {
            reject({
                STATUSCODE: result.status,
                status: result.status,
                message: result.status_message
            });
        }
    }

    function updateTTL(entity) {
        return new Promise(function (resolve, reject) {
            _bc.globalEntity.updateEntityTimeToLive(entity.entityId, entity.version, entity.timeToLive, result => {
                var status = result.status;
                console.log(status + " : " + JSON.stringify(result, null, 2));
            });
        });
    }


    return (type, resource, params) => {
        var mode = 'global';
        var service = globalService;

        if (resource.endsWith('@user')) {
            mode = 'user';
            resource = resource.substring(0, resource.lastIndexOf('@'));
            service = userService;
        }
        if (resource.endsWith('@global')) {
            mode = 'global';
            resource = resource.substring(0, resource.lastIndexOf('@'));
            service = globalService;
        }
        if (verbose) console.log("===> bcDataProvider: %s for %s", type, resource);
        if (verbose) console.log("===> bcDataProvider:Params %s", JSON.stringify(params));
        switch (type) {
            case GET_LIST:
                return new Promise(function (resolve, reject) {
                    const {
                        page,
                        perPage
                    } = params.pagination;
                    // TODO: Support for paging, and Sorting.
                    console.log("%%%%%%%%%%%%%%%%%%%");
                    console.log("for " + resource);
                    console.log(params);
                    console.log("%%%%%%%%%%%%%%%%%%%");
                    var context = {
                        "pagination": {
                            "rowsPerPage": perPage,
                            "pageNumber": page
                        },
                        "searchCriteria": {
                            "entityType": resource,
                            ...genFilterCriteria(params.filter, resource)
                        },
                        "sortCriteria": genSortCriteria(params, resource)
                    };
                    // context.sortCriteria[params.sort.field] = params.sort.order === "ASC" ? 1 : -1;
                    if (verbose) console.log("==> %s: with %s", type, JSON.stringify(context));
                    service.getPage(context, result => {
                        if (verbose) console.log("==> %s got response with status %d", type, result.status);
                        if (result.status === 200) {
                            const data = {
                                data: entitiesToData(result.data.results.items),
                                total: result.data.results.count
                            };
                            if (verbose) console.log("==> Data: ", data);
                            resolve(data);
                        } else {
                            reject({
                                STATUSCODE: result.status,
                                status: result.status,
                                message: result.status_message
                            });
                        };
                    });
                });
            case GET_ONE:
                return new Promise(function (resolve, reject) {
                    const id = params.id;
                    var where = { "entityType": resource, "entityId": id };
                    if (indexedIdResources.includes(resource)) {
                        where = { "entityType": resource, "entityIndexedId": id };
                    }
                    service.getList(where, {}, 1, result => {
                        if (verbose) console.log("==> %s got response for %s with status %d", type, id, result.status);
                        if (result.status === 200) {
                            if (result.data.entityList && result.data.entityList.length > 0) {
                                const raEntity = entityToRaEntity(result.data.entityList[0]);
                                resolve({
                                    data: raEntity
                                });
                            } else {
                                resolve({ data: {} });
                            }
                        } else {
                            reject({
                                STATUSCODE: result.status,
                                status: result.status,
                                message: result.status_message
                            });
                        };
                    });
                });
            case CREATE:
                return new Promise(function (resolve, reject) {
                    const { id, _entity, ...entityData } = params.data;
                    const timeToLive = _entity ? _entity.timeToLive || -1 : -1;
                    const jsonEntityAcl = _entity ? _entity.acl || { "other": 1 } : { "other": 1 };
                    if (indexedIdResources.includes(resource)) {
                        service.createEntityWithIndexedId(resource, id, timeToLive, jsonEntityAcl, entityData, result => {
                            processCreateReply(result, resolve, reject);
                        })
                    } else if (params.data.hasOwnProperty("_entity") && params.data._entity.hasOwnProperty("entityIndexedId")) {
                        service.createEntityWithIndexedId(resource, _entity.entityIndexedId, timeToLive, jsonEntityAcl, entityData, result => {
                            processCreateReply(result, resolve, reject);
                        })
                    } else {
                        service.create(resource, timeToLive, jsonEntityAcl, entityData, result => {
                            processCreateReply(result, resolve, reject);
                        })
                    }
                });
            case UPDATE:
                return new Promise(function (resolve, reject) {
                    var id = params.data._entity.entityId;
                    var data = params.data;
                    var entity = dataToEntity(data);
                    var updatedTTL = entity.timeToLive !== params.previousData._entity.timeToLive;
                    var udpatedACL = entity.acl !== params.previousData._entity.acl;
                    var udpatedOwner = entity.ownerId !== params.previousData._entity.ownerId;
                    service.update(id, entity.entityType, entity.data, entity.acl, entity.version, result => {
                        if (result.status === 200) {
                            var newData = entity.data; // 
                            newData._entity = result.data;
                            resolve({
                                data: newData
                            });
                        } else {
                            reject({
                                STATUSCODE: result.status,
                                status: result.status,
                                message: result.status_message
                            });
                        };
                    });
                });
            case DELETE:
                return new Promise(function (resolve, reject) {
                    var id = params.id;
                    var data = params.previousData;
                    var entity = dataToEntity(data);
                    service.deleteEntity(id, entity.version, result => {
                        if (result.status === 200) {
                            resolve({ data });
                        } else {
                            reject({
                                STATUSCODE: result.status,
                                status: result.status,
                                message: result.status_message
                            });
                        };
                    });
                });
            case GET_MANY:
                return new Promise(function (resolve, reject) {
                    var where = {
                        "entityType": resource,
                        "entityId": {
                            "$in": params.ids
                        }
                    };
                    var orderBy = {
                        "entityId": 1
                    };
                    if (indexedIdResources.includes(resource)) {
                        var where = {
                            "entityType": resource,
                            "entityIndexedId": {
                                "$in": params.ids
                            }
                        };
                        var orderBy = {
                            "entityIndexedId": 1
                        };
                    }
                    var maxReturn = params.ids.length;

                    if (verbose) console.log("==> %s: with %s", type, JSON.stringify(where));
                    service.getList(where, orderBy, maxReturn, result => {
                        if (verbose) console.log("==> %s got response with status %d", type, result.status);
                        if (result.status === 200) {
                            const data = {
                                data: entitiesToData(result.data.entityList, true)
                            };
                            if (verbose) console.log("==> Data: ", data);
                            resolve(data);
                        } else {
                            reject({
                                STATUSCODE: result.status,
                                status: result.status,
                                message: result.status_message
                            });
                        };
                    });
                });

            case DELETE_MANY:
                return Promise.all(params.ids.map(id => {
                    // This will not work on entityIndexdedId items.
                    if (indexedIdResources.includes(resource)) return Promise.reject({
                        STATUSCODE: 500,
                        status: 500,
                        message: "Cannot delete resources using entityIndexedId"
                    });
                    return new Promise(function (resolve, reject) {
                        service.deleteEntity(id, -1, result => {
                            if (result.status === 200) {
                                resolve();
                            } else {
                                reject({
                                    STATUSCODE: result.status,
                                    status: result.status,
                                    message: result.status_message
                                });
                            };
                        });
                    });
                })).then(data => {
                    return { data: params.ids };
                });
            case UPDATE_MANY:
                {
                    if (verbose) console.log("!!> %s: NOT YET SUPPORTED params: %s ", type, JSON.stringify(params));
                    //TODO: Implement UPDATE_MANY
                    break;
                }
            case GET_MANY_REFERENCE:
                {
                    if (verbose) console.log("!!> %s: NOT YET SUPPORTED params: %s ", type, JSON.stringify(params));
                    //TODO: Implement GET_MANY_REFERENCE
                    // const { page, perPage } = params.pagination;
                    // const { field, order } = params.sort;
                    // const query = {
                    //     sort: JSON.stringify([field, order]),
                    //     range: JSON.stringify([
                    //         (page - 1) * perPage,
                    //         page * perPage - 1,
                    //     ]),
                    //     filter: JSON.stringify({
                    //         ...params.filter,
                    //         [params.target]: params.id,
                    //     }),
                    // };
                    // url = `${apiUrl}/${resource}?${stringify(query)}`;
                    break;
                }
            case 'RUN_SCRIPT':
                return new Promise(function (resolve, reject) {
                    _bc.script.runScript(resource, params, result => {
                        if (verbose) console.log(status + " : " + JSON.stringify(result, null, 2));
                        var status = result.status;
                        if (status == 200) {
                            resolve(result);
                        } else {
                            reject(result);
                        }
                    });                
                });
            default:
        throw new Error(`Unsupported Data Provider request type ${type}`);
    }

};
};