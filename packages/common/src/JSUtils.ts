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

let UNDEF;

const extend = (deep: boolean, to, from) => {
    if (from == null || typeof from != 'object') {
        return from;
    }

    if (from.constructor != Object && from.constructor != Array) {
        return from;
    }

    if (
        from.constructor == Date || from.constructor == RegExp || from.constructor == Function ||
        from.constructor == String || from.constructor == Number || from.constructor == Boolean
    ) {
        return new from.constructor(from);
    }


    to = to || new from.constructor();

    for (const name in from) {
        // to[name] = extend(to[name],from[name]);
        to[name] = extend(deep, deep ? to[name] : null, from[name]);

        // to[name] = typeof to[name] == "undefined"
        //     ? extend(from[name], null)
        //     : to[name];
    }

    return to;
};

const mixin = (to, from) => {
    for (const p in from) {
        if (p != 'constructor') {
            to[p] = from[p];
        }
    }
    return to;
};

const clone = (o) => {
    // return this.extend(true,o);
    let newO;
    let i;

    if (typeof o !== 'object') {
        return o;
    }

    if (!o) {
        return o;
    }

    if (Object.prototype.toString.apply(o) === '[object Array]') {
        newO = [];
        for (i = 0; i < o.length; i += 1) {
            newO[i] = clone(o[i]);
        }
        return newO;
    }

    newO = {};
    for (i in o) {
        if (o.hasOwnProperty(i)) {
            newO[i] = clone(o[i]);
        }
    }
    return newO;
};

const JSUtils = {

    loglevel: 'debug',

    dump: (msg: string, loglevel?: string) => {
        const debug = !!JSUtils.loglevel;
        // @ts-ignore
        const args = Array.prototype.slice.call(arguments);
        let level = args[args.length - 1];
        const console = window.console;

        if (debug && !!console) {
            if (level in console) args.pop();
            else level = 'log';

            // workaround for IE9, in which console.log is not an instance of Function
            if (debug === true || debug === level) {
                if (Function.prototype.bind && typeof console.log == 'object') {
                    const log = Function.prototype.bind.call(console[level], console);
                    log.apply(console, args);
                } else {
                    console[level].apply(console, args);
                }
            }
        }
        return JSUtils;
    },

    extend: (deep: boolean | object, to, from?) => {
        if (typeof deep != 'boolean') {
            from = to;

            to = deep;

            deep = false;
        }

        return extend(deep, to, from);
    },

    clone: clone,


    createObject: Object['create'] || ((o) => {
        const F = () => {
        };
        F.prototype = o;
        return new F();
        // // Set the prototype chain to inherit from `parent`, without calling
        // // `parent`'s constructor function.
        // var Surrogate = function(){ this.constructor = child; };
        // Surrogate.prototype = parent.prototype;
        // child.prototype = new Surrogate;
    }),

    inheritClass: (Super, Sub, Prot) => {
        const SubProt = Sub.prototype;
        const SuperProt = Super.prototype;

        if (typeof Sub == 'object') {
            Prot = Sub;

            // Sub = Sub.constructor == Object
            //     ? Super
            //     : Sub.constructor;

            if (Sub.constructor == Object.prototype.constructor) {
                Sub.constructor = function() {
                    Super.apply(this, arguments);
                };
            }

            Sub = Sub.constructor;

            // Sub = Sub.constructor == Object.prototype.constructor
            //     ? Super//function(){}
            //     : Sub.constructor;
        }

        Sub.prototype = JSUtils.createObject(SuperProt);

        if (SubProt && SubProt != Object.prototype) {
            mixin(Sub.prototype, SubProt);
        }

        // Sub.prototype.constructor = Sub;
        // Sub.prototype._super  = Super.prototype;

        // copy over statics if defined
        for (const s in Super) {
            Sub[s] = Super[s];
        }

        if (Prot) {
            mixin(Sub.prototype, Prot);
        }

        return Sub;
    },

    isFunction: (f) => {
        return typeof f == 'function';
    },

    isNumeric: (val) => {
        return !isNaN(+val) && isFinite(val);
    },

    isPlainObject: (obj) => {
        // Must be an Object.
        // Because of IE, we also have to check the presence of the constructor property.
        // Make sure UTILS DOM nodes and window objects don't pass through, as well
        if (!obj || typeof obj !== 'object' || obj['nodeType'] || obj == obj['window']) {
            return false;
        }

        try {
            // Not own constructor property must be Object
            if (obj['constructor'] && !obj.hasOwnProperty('constructor') && !obj['constructor']['prototype'].hasOwnProperty('isPrototypeOf')) {
                return false;
            }
        } catch (e) {
            // IE8,9 Will throw exceptions on certain host objects #9897
            return false;
        }

        // Own properties are enumerated firstly, so to speed up,
        // if last one is own, then all properties are own.
        let key;
        for (key in obj) {
        }

        return key === UNDEF || obj.hasOwnProperty(key);
    },

    // extend: function ()
    // {
    //     var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {},
    //         i = 1,
    //         length = arguments.length,
    //         deep = false;
    //
    //     // Handle a deep copy situation
    //     if(typeof target === "boolean"){
    //         deep = target;
    //         target = arguments[1] || {};
    //         // skip the boolean and the target
    //         i = 2;
    //     }
    //
    //     // Handle case when target is a string or something (possible in deep copy)
    //     if(typeof target !== "object" && typeof target !== "function")
    //         target = {};
    //
    //     // extend jQuery itself if only one argument is passed
    //     if( length === i ){
    //         target = this;
    //         --i;
    //     }
    //
    //     for(; i < length; i++){
    //         // Only deal with non-null/undefined values
    //         if((options = arguments[i]) != null){
    //             // Extend the base object
    //             for(name in options){
    //                 src = target[name];
    //                 copy = options[name];
    //
    //                 // Prevent never-ending loop
    //                 if(target === copy)
    //                     continue;
    //
    //                 // Recurse if we're merging plain objects or arrays
    //                 if(deep && copy && (JSUtils.isPlainObject(copy) || (copyIsArray = Array.isArray(copy)))){
    //                     if(copyIsArray){
    //                         copyIsArray = false;
    //                         clone = src && Array.isArray(src) ? src : [];
    //                     }
    //                     else
    //                         clone = src && JSUtils.isPlainObject(src) ? src : {};
    //
    //                     // Never move original objects, clone them
    //                     target[name] = JSUtils.extend(deep, clone, copy);
    //                 }
    //                 else if(copy !== UNDEF)
    //                     target[name] = copy;
    //             }
    //         }
    //     }
    //
    //     // Return the modified object
    //     return target;
    // },

    String:
        {
            round: (value: number, decimals?: number) => {
                return decimals ? Number(value.toFixed(decimals)) : Math.round(value);
            },

            random: (length?: number) => {
                length = length || 16;

                let text = '';
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
                const cLen = chars.length;

                for (let i = 0; i < length; i++) {
                    text += chars.charAt(Math.random() * cLen ^ 0);
                }

                return text;
            }
        }

};

export default JSUtils;
