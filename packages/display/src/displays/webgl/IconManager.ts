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

import ImageResourceHandler from '../ImageResourceHandler';
import {Atlas, ImageInfo} from './Atlas';

class IconManager {
    private images = new ImageResourceHandler();
    private atlas: Atlas;

    onLoad: (info: ImageInfo) => void;

    constructor(gl: WebGLRenderingContext, tu: number) {
        this.atlas = new Atlas({
            gl: gl,
            maxImgSize: 64
        });
    }

    getTexture(): WebGLTexture {
        return this.atlas.texture;
    }

    get(src: string, width?: number, height?: number, readyCb?: (atlasInfo: ImageInfo) => void): ImageInfo | false {
        const {atlas, images, onLoad} = this;
        let info = atlas.get(src);

        if (!info) {
            const img = images.get(src, (img) => {
                info = atlas.set(src, img);
                // let old = atlas.get(src);
                if (readyCb) {
                    readyCb(info);
                }
                if (onLoad) {
                    onLoad(info);
                }
            });

            if (!img.ready) {
                return false;
                // set empty dummy until real image is ready...
                // info = atlas.set(src, {width: width, height: height});
            }
        }

        return info;
    }

    destroy() {
        this.atlas.destroy();
    }
}

export {IconManager};
