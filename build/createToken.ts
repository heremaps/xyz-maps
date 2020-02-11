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

import {argv} from './tools';
import {writeFileSync, readFileSync} from 'fs';
import {join} from 'path';

const accessToken = argv('token');
if (accessToken) {
    writeFileSync('./debug/token.js',
        readFileSync('./debug/token.tmpl.js', 'utf-8')
            .replace('{ACCESS_TOKEN}', <string>accessToken),
    );

    for (let module of ['playground', 'tests']) {
        const pgCredentialsPath = join(__dirname, `../packages/${module}/credentials.json`);
        let pgCredentials;

        try {
            pgCredentials = require(pgCredentialsPath);
        } catch (e) {
            pgCredentials = {'access_token': ''};
        }

        pgCredentials['access_token'] = accessToken;

        writeFileSync(pgCredentialsPath, JSON.stringify(pgCredentials, null, 2));
    }
} else {
    console.error('NO TOKEN PROVIDED!');
}
