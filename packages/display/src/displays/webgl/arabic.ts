/*
 * Copyright (C) 2019-2021 HERE Europe B.V.
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

// Conversion logic is based on:
// github.com/heremaps/harp.gl/blob/master/@here/harp-text-canvas/lib/utils/ContextualArabicConverter.ts

type PresentationFromB = { initial?: number; medial?: number; final?: number; isolated?: number; }

const ARABIC_BLOCK_START = 0x621;

const SINGLE_CHARS: Map<number, PresentationFromB> = new Map();

let UNDEF;

[
    [UNDEF, UNDEF, UNDEF], // HAMZA
    [UNDEF, UNDEF, 0xfe82], // ALEF WITH MADDA ABOVE
    [UNDEF, UNDEF, 0xfe84], // ALEF WITH HAMZA ABOVE
    [UNDEF, UNDEF, 0xfe86], // WAW WITH HAMZA ABOVE
    [UNDEF, UNDEF, 0xfe88], // ALEF WITH HAMZA BELOW
    [0xfe8b, 0xfe8c, 0xfe8a], // YEH WITH HAMZA ABOVE
    [UNDEF, UNDEF, 0xfe8e], // ALEF
    [0xfe91, 0xfe92, 0xfe90], // BEH
    [UNDEF, UNDEF, 0xfe94], // TEH MARBUTA
    [0xfe97, 0xfe98, 0xfe96], // TEH
    [0xfe9b, 0xfe9c, 0xfe9a], // THEH
    [0xfe9f, 0xfea0, 0xfe9e], // JEEM
    [0xfea3, 0xfea4, 0xfea2], // HAH
    [0xfea7, 0xfea8, 0xfea6], // KHAH
    [UNDEF, UNDEF, 0xfeaa], // DAL
    [UNDEF, UNDEF, 0xfeac], // THAL
    [UNDEF, UNDEF, 0xfeae], // REH
    [UNDEF, UNDEF, 0xfeb0], // ZAIN
    [0xfeb3, 0xfeb4, 0xfeb2], // SEEN
    [0xfeb7, 0xfeb8, 0xfeb6], // SHEEN
    [0xfebb, 0xfebc, 0xfeba], // SAD
    [0xfebf, 0xfec0, 0xfebe], // DAD
    [0xfec3, 0xfec4, 0xfec2], // TAH
    [0xfec7, 0xfec8, 0xfec6], // ZAH
    [0xfecb, 0xfecc, 0xfeca], // AIN
    [0xfecf, 0xfed0, 0xfece], // GHAIN
    UNDEF, UNDEF, UNDEF, UNDEF, UNDEF,
    [0x0640, 0x0640, 0x0640], // TATWEEL
    [0xfed3, 0xfed4, 0xfed2], // FEH
    [0xfed7, 0xfed8, 0xfed6], // QAF
    [0xfedb, 0xfedc, 0xfeda], // KAF
    [0xfedf, 0xfee0, 0xfede], // LAM
    [0xfee3, 0xfee4, 0xfee2], // MEEM
    [0xfee7, 0xfee8, 0xfee6], // NOON
    [0xfeeb, 0xfeec, 0xfeea], // HEH
    [UNDEF, UNDEF, 0xfeee], // WAW
    [UNDEF, UNDEF, 0xfef0], // ALEF MAKSURA
    [0xfef3, 0xfef4, 0xfef2] // YEH
].forEach((formB, i) => {
    SINGLE_CHARS.set(ARABIC_BLOCK_START + i, formB && {initial: formB[0], medial: formB[1], final: formB[2]});
});

SINGLE_CHARS.set(0x067e, {initial: 0xfb58, medial: 0xfb59, final: 0xfb57}); // PEH
SINGLE_CHARS.set(0x06cc, {initial: 0xfbfe, medial: 0xfbff, final: 0xfbfd}); // FARSI YEH
SINGLE_CHARS.set(0x0686, {initial: 0xfb7c, medial: 0xfb7d, final: 0xfb7b}); // TCHEH
SINGLE_CHARS.set(0x06a9, {initial: 0xfb90, medial: 0xfb91, final: 0xfb8f}); // KEHEH
SINGLE_CHARS.set(0x06af, {initial: 0xfb94, medial: 0xfb95, final: 0xfb93}); // GAF
SINGLE_CHARS.set(0x0698, {final: 0xfb8b}); // JEH


const NEUTRAL_CHARS = new Set<number>([
    0x0610, // SIGN SALLALLAHOU ALAYHE WASSALLAM
    0x0612, // SIGN ALAYHE ASSALLAM
    0x0613, // SIGN RADI ALLAHOU ANHU
    0x0614, // SIGN TAKHALLUS
    0x0615, // SMALL HIGH TAH
    0x064b, // FATHATAN
    0x064c, // DAMMATAN
    0x064d, // KASRATAN
    0x064e, // FATHA
    0x064f, // DAMMA
    0x0650, // KASRA
    0x0651, // SHADDA
    0x0652, // SUKUN
    0x0653, // MADDAH ABOVE
    0x0654, // HAMZA ABOVE
    0x0655, // HAMZA BELOW
    0x0656, // SUBSCRIPT ALEF
    0x0657, // INVERTED DAMMA
    0x0658, // MARK NOON GHUNNA
    0x0670, // LETTER SUPERSCRIPT ALEF
    0x06d6, // SMALL HIGH LIGATURE SAD WITH LAM WITH ALEF MAKSURA
    0x06d7, // SMALL HIGH LIGATURE QAF WITH LAM WITH ALEF MAKSURA
    0x06d8, // SMALL HIGH MEEM INITIAL FORM
    0x06d9, // SMALL HIGH LAM ALEF
    0x06da, // SMALL HIGH JEEM
    0x06db, // SMALL HIGH THREE DOTS
    0x06dc, // SMALL HIGH SEEN
    0x06df, // SMALL HIGH ROUNDED ZERO
    0x06e0, // SMALL HIGH UPRIGHT RECTANGULAR ZERO
    0x06e1, // SMALL HIGH DOTLESS HEAD OF KHAH
    0x06e2, // SMALL HIGH MEEM ISOLATED FORM
    0x06e3, // SMALL LOW SEEN
    0x06e4, // SMALL HIGH MADDA
    0x06e7, // SMALL HIGH YEH
    0x06e8, // SMALL HIGH NOON
    0x06ea, // EMPTY CENTRE LOW STOP
    0x06eb, // EMPTY CENTRE HIGH STOP
    0x06ec, // ROUNDED HIGH STOP WITH FILLED CENTRE
    0x06ed // SMALL LOW MEEM
]);

const LETTER_LAM = 0x0644;
const LAM_ALEF_LIGATURES: { [cp: number]: PresentationFromB } = {
    0x0622: {isolated: 0xfef5, final: 0xfef6}, // LAM WITH ALEF WITH MADDA ABOVE
    0x0623: {isolated: 0xfef7, final: 0xfef8}, // LAM WITH ALEF WITH HAMZA ABOVE
    0x0625: {isolated: 0xfef9, final: 0xfefa}, // LAM WITH ALEF WITH HAMZA BELOW
    0x0627: {isolated: 0xfefb, final: 0xfefc} // LAM WITH ALEF
};

const findLigatures = (text: string, index: number, dir: -1 | 1): { cp: number, map: PresentationFromB } => {
    const length = dir > 0 ? text.length - index : index + 1;
    for (let i = 1, cp; i < length; i++) {
        cp = text.charCodeAt(index + (dir * i));
        if (!NEUTRAL_CHARS.has(cp)) {
            return {cp: cp, map: SINGLE_CHARS.get(cp)};
        }
    }
};

const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

export const toPresentationFormB = (text: string): string => {
    if (!isArabic(text)) {
        return text;
    }
    let formB = '';
    for (let i = 0; i < text.length; ++i) {
        let curCP = text.charCodeAt(i);
        if (SINGLE_CHARS.has(curCP)) {
            let prevMap = findLigatures(text, i, -1)?.map;
            if (prevMap && !prevMap.initial && !prevMap.medial) {
                prevMap = UNDEF;
            }

            let next = findLigatures(text, i, 1);
            let nextMap = next?.map;
            if (nextMap && !nextMap.medial && !nextMap.final) {
                nextMap = UNDEF;
            }

            let lamAlefLigature;
            if (lamAlefLigature = curCP == LETTER_LAM && LAM_ALEF_LIGATURES[next?.cp]) {
                curCP = prevMap ? lamAlefLigature.final : lamAlefLigature.isolated;
                i++; // skip next char
            } else {
                const map = SINGLE_CHARS.get(curCP)!;
                if (prevMap && nextMap && map.medial) {
                    curCP = map.medial;
                } else if (prevMap && map.final) {
                    curCP = map.final;
                } else if (nextMap && map.initial) {
                    curCP = map.initial;
                }
            }
        }
        formB += String.fromCharCode(curCP);
    }
    return formB;
};
