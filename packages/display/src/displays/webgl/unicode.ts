/*
 * Copyright (C) 2019-2022 HERE Europe B.V.
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

export const isNeutralDirection = (cc: number) => {
    // ASCII punctuation and symbols
    return (
        cc >= 0x0020 && cc <= 0x002f ||
        cc >= 0x003a && cc <= 0x0040 ||
        cc >= 0x005b && cc <= 0x0060 ||
        cc >= 0x007b && cc <= 0x007e
    );
};

export const isRTL = (cc: number) => {
    return (
        // Hebrew (0x0590) + Arabic (0x0600)
        (cc >= 0x0590 && cc <= 0x06ff) ||
        // Arabic Supplement ||
        (cc >= 0x0750 && cc <= 0x077F) ||
        // Arabic Extended-A
        (cc >= 0x08A0 && cc <= 0x08FF) ||
        // Arabic Presentation Forms-A
        (cc >= 0xfb50 && cc <= 0xfdff) ||
        // Arabic Presentation Forms-B
        (cc >= 0xfe70 && cc <= 0xfeff)
    );
};

export const isDigit = (cc: number) => {
    return cc > 47 && cc < 58;
};

export const getDirection = (cc: number): number => {
    return (isNeutralDirection(cc) || isDigit(cc)) ? 0 : isRTL(cc) ? -1 : 1;
};
