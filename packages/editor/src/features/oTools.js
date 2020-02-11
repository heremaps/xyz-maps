/*
 * Copyright (C) 2019-2020 HERE Europe B.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 * License-Filename: LICENSE
 */

import MTOOLS from './marker/MarkerTools';

import ATOOLS from './area/PolygonTools';
import LINETOOLS from './line/LineTools';
import LINKTOOLS from './link/NavLinkTools';
import LOCATIONTOOLS from './location/LocationTools';
const tools = {};


tools['MARKER'] = MTOOLS;

tools['AREA'] = ATOOLS;

tools['LINE'] = LINETOOLS;

const linkTools =
    tools['NAVLINK'] = LINKTOOLS;
const locationTools =
    tools['PLACE'] =
    tools['ADDRESS'] = LOCATIONTOOLS;

// avoid circular dependencies
locationTools.setLinkTools( linkTools );


function getObjectTools( obj ) {
    return tools[obj.class];
}


function createProxy(p) {
    return function( o ) {
        const objType = o.class;
        const tool = tools[objType][p];

        if ( tool ) {
            return tool.apply( tool, arguments );
        }

        console.warn('No Tool', p, 'defined for', objType);
    };
}

const oTools = {

    getTool: function( obj, name ) {
        const tools = getObjectTools( obj );

        return tools && name ? tools[name] : tools;
    },

    private: createProxy('private'),

    getEventListener: function( obj, type ) {
        const tools = getObjectTools(obj);

        if ( tools ) {
            return tools._evl[type] || tools.private( obj, type );
        }

        // fallback for overlay objects
        return obj.__ && obj.__[type] || obj[type];
    }

};

for ( const type in tools ) {
    for ( const t in tools[type] ) {
        if ( !oTools[t] ) {
            oTools[t] = createProxy(t);
        }
    }
}


// window.oTools = oTools;

export default oTools;
