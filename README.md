# brainCloud react-admin Library

Thanks for downloading the brainCloud-react-admin dataProvider library! Here are a few notes to get you started. 

This module will help you quickly create admin portal to administer global entities from your brainCloud application.

You can use it for viewing, charting, editing, your global entities. 

Further information about the brainCloud API, including example Tutorials can be found here:

http://getbraincloud.com/apidocs/

If you haven't signed up or you want to log into the brainCloud portal, you can do that here:

https://portal.braincloudservers.com/

Information about react-admin can be found at:

http://marmelab.com/react-admin/


## Install

``` shell
npm install braincloud-react-admin
```

## Usage

App.js
``` typescript
import React from 'react';
import { Admin, Resource } from 'react-admin';

import bcReactAdmin from 'braincloud-react-admin';  // import this module
import bc from 'braincloud';                        // import brainCloud node module (installed by braincloud-react-admin)

import { DeviceShow, DevicestateList } from "./Device";
import { ClientEdit, ClientCreate,ClientList, ClientShow } from "./Client";
import { LogsList } from "./Logs";

var _bc = new bc.BrainCloudWrapper("my-react-admin-app");
_bc.initialize("99999","aaaaaaaa-bbbb-cccc-0000-111111111111","0.1");  // Provide your appId and appSecret from brainCloud admin portal.

const resourcesUsingIndexedIdAsKey = ["Client"];
const verboseMode = false;
const authProvider = bcReactAdmin.bcAuthProvider(_bc,verboseMode);
const dataProvider = bcReactAdmin.bcDataProvider(_bc,resourcesUsingIndexedIdAsKey,verboseMode);


const App = () => (
  <Admin authProvider={authProvider}  dataProvider={dataProvider}>
     <Resource name="DeviceState" list={DevicestateList} show={DeviceShow} />
     <Resource name="Client" list={ClientList} show={ClientShow} edit={ClientEdit} create={ClientCreate} />
     <Resource name="Logs" list={LogsList} />
  </Admin>
  );

export default App;

```

Client.js
``` typescript
import React from 'react';
import {List,Datagrid,Show,SimpleShowLayout,TextField,Create,Edit,SimpleForm,DisabledInput,TextInput,ShowButton} from 'react-admin';

export const ClientList = props => (
    <List {...props}>
        <Datagrid>
            <TextField source="clientId" />
            <TextField source="name" />
            <TextField source="lastVisited" />
            <ShowButton />
        </Datagrid>
    </List>
);

export const ClientShow = (props) => (
    <Show {...props}>
        <SimpleShowLayout>
            <TextField source="clientId" />
            <TextField source="name" />
            <TextField source="lastVisited" />
        </SimpleShowLayout>
    </Show>
);

export const ClientCreate = (props) => (
    <Create {...props}>
        <SimpleForm>
            <TextInput source="clientId" />
            <TextInput source="name" />
            <DisabledInput source="lastVisited" />
        </SimpleForm>
    </Create>    
);

export const ClientEdit = (props) => (
    <Edit {...props}>
        <SimpleForm>
            <DisabledInput source="clientId" />
            <TextInput source="name" />
            <DisabledInput source="lastVisited" />
        </SimpleForm>
    </Edit>
);

```

Sample Global Entity for Client.
``` JSON
    {
        "entityId": "13ff3931-4391-49bc-b07e-06883e0d97b8",
        "ownerId": "49963b51-0085-477e-8cfa-f1b9cc4ccc5a",
        "entityType": "Client",
        "entityIndexedId": "100",
        "version": 2768,
        "data": {
            "clientId": "100",
            "name": "Wayne Entrprises",
            "lastVisited": "Tue Aug 21 2018 20:45:11 GMT-0000 (UTC)"
        },
        "acl": {
            "other": 1
        },
        "expiresAt": 9223372036854776000,
        "timeToLive": -1,
        "createdAt": 1519695401962,
        "updatedAt": 1534884311510
    }
```
## Troubleshooting

Here are a few common errors that you may see on your first attempt to connect to brainCloud.

- **App id not set**: Verify you've set up the app id and app secret correctly in the `initialize()` method.
- **Platform not enabled**: Verify you've enabled your platform on the portal.

If you're still having issues, log into the portal and give us a shout through the help system (bottom right icon with the question mark and chat bubble).

## brainCloud Summary

brainCloud is a ready-made back-end platform for the development of feature-rich games, apps and things. brainCloud provides the features you need – along with comprehensive tools to support your team during development, testing and user support.

brainCloud consists of:
- Cloud Service – an advanced, Software-as-a-Service (SaaS) back-end
- Client Libraries – local client libraries (SDKs)
- Design Portal – a portal that allows you to design and debug your apps
- brainCloud Architecture

