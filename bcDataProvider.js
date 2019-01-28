// in bcDataProvider.js
import {
    GET_LIST,
    GET_ONE,
    CREATE,
    UPDATE,
    DELETE,
    GET_MANY,
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
export default (bc, verbose = false) => {

    var _bc = bc;

    const validEntitySortFields = ["ownerId","entityType","entityIndexedId","timeToLive","createdAt","updatedAt"];
    
    function entityToRaEntity(entity) {
        var raEntity = entity.data || {};
        raEntity._entity = (({
            gameId,
            entityId,
            ownerId,
            entityType,
            entityIndexedId,
            version,
            acl,
            expiresAt,
            timeToLive,
            createAt,
            updateAt
        }) => ({
            gameId,
            entityId,
            ownerId,
            entityType,
            entityIndexedId,
            version,
            acl,
            expiresAt,
            timeToLive,
            createAt,
            updateAt
        }))(entity);
        raEntity.id = entity.entityId;
        return raEntity;
    }

    function entitiesToData(entities,useIndexId=false) {
        var raEntities = [];
        if (entities) {
            var arr = entities
            raEntities = arr.map(entity => {
                var item = entityToRaEntity(entity);
                if (useIndexId) {
                    item.id = item._entity.entityIndexedId;
                }
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

    function genSortCriteria(params) {
        var sortField = params.sort.field;
        
        // id is an alias to _entity.entityId
        if (sortField === "id") sortField = "_entity.entityId";
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

    function genFilterCriteria(params) {
        var filterCriteria = {};
        for (const field in params.filter) {
            if (params.filter.hasOwnProperty(field)) {
                const element = params.filter[field];
                var entityField = field;
                if (entityField === "id") entityField = "_entity.entityId";
                if (entityField.startsWith("_entity")) {
                    entityField = entityField.substring(8);
                } else {
                    entityField = "data." + entityField;
                }
                filterCriteria[entityField] = element;
            }
        }
        return filterCriteria;
    }


    return (type, resource, params) => {
        if (verbose) console.log("===> bcDataProvider: %s", type);
        if (verbose) console.log("===> bcDataProvider:Params %s", JSON.stringify(params));
        switch (type) {
            case GET_LIST:
                return new Promise(function (resolve, reject) {
                    const {
                        page,
                        perPage
                    } = params.pagination;
                    // TODO: Support for paging, and Sorting.
                    var context = {
                        "pagination": {
                            "rowsPerPage": perPage,
                            "pageNumber": page
                        },
                        "searchCriteria": {
                            "entityType": resource,
                            ...genFilterCriteria(params)
                        },
                        "sortCriteria": genSortCriteria(params)
                    };
                    // context.sortCriteria[params.sort.field] = params.sort.order === "ASC" ? 1 : -1;
                    if (verbose) console.log("==> %s: with %s", type, JSON.stringify(context));
                    _bc.globalEntity.getPage(context, result => {
                        if (verbose) console.log("==> %s got response with status %d", type, result.status);
                        if (result.status === 200) {
                            const data = { data:entitiesToData(result.data.results.items), total:result.data.results.count};
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
                    var id = params.id;
                    _bc.globalEntity.readEntity(id, result => {
                        if (verbose) console.log("==> %s got response for %s with status %d", type, id, result.status);
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
                        };
                    });
                });
            case CREATE:
                return new Promise(function (resolve, reject) {
                    const timeToLive = -1;
                    const jsonEntityAcl = {
                        "other": 1
                    };
                    const entityData = params.data;
                    _bc.globalEntity.createEntity(resource, timeToLive, jsonEntityAcl, entityData, result => {
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
                    })

                });
            case UPDATE:
                return new Promise(function (resolve, reject) {
                    var id = params.id;
                    var data = params.data;
                    var entity = dataToEntity(data);
                    _bc.globalEntity.updateEntity(id, entity.version, entity.data, result => {
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
                    var data = params.data;
                    var entity = dataToEntity(data);
                    _bc.globalEntity.deleteEntity(id, entity.version, result => {
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
            case GET_MANY:
                return new Promise(function (resolve, reject) {
                    var where = {
                        "entityType": resource,
                        "entityIndexedId" : { "$in": params.ids }
                    };
                    var orderBy = {"entityIndexedId": 1};
                    var maxReturn = 50;

                    if (verbose) console.log("==> %s: with %s", type, JSON.stringify(where));
                    _bc.globalEntity.getList(where, orderBy, maxReturn, result => {
                        if (verbose) console.log("==> %s got response with status %d", type, result.status);
                        if (result.status === 200) {
                            const data = {data:entitiesToData(result.data.entityList,true)};
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
            case GET_MANY_REFERENCE:
                {
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
            default:
                throw new Error(`Unsupported Data Provider request type ${type}`);
        }

    };
};