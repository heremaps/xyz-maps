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
import utag from 'utag';
import {injectCss, pg} from './playground';

import simplescrollbarscss from 'codemirror/addon/scroll/simplescrollbars.css';
import codemirrorcss from 'codemirror/lib/codemirror.css';
import abcdefcss from 'codemirror/theme/abcdef.css';

import javascript from 'codemirror/mode/javascript/javascript';
import activeLine from 'codemirror/addon/selection/active-line';
import simplescrollbars from 'codemirror/addon/scroll/simplescrollbars';

injectCss(simplescrollbarscss);
injectCss(codemirrorcss);
injectCss(abcdefcss);

utag();
export default pg;
