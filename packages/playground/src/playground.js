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

import $ from 'jquery';
import CodeMirror from 'codemirror';
import xyzmaps from '../examples/xyzmaps.json';

import pgSettings from 'settings';
import credentials from 'credentials';

export let injectCss = (css, doc) => {
    doc = doc || document;
    let head = doc.head || doc.getElementsByTagName('head')[0];
    let style = doc.createElement('style');
    style.type = 'text/css';

    head.appendChild(style);

    if (style.styleSheet) {
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }
};

export let pg = new (function Playground() {
    var playground = this;
    var ts = Math.round(Math.random() * 1000) + ('' + new Date().getTime()).substr(-4);
    var codeEditor = null;
    var authtry = 0;
    var speed = 500;
    var visiblePH1 = '/*###visiblesource*/';
    var visiblePH2 = '/*visiblesource###*/';
    var visibleSrcRex = /^[\s\S]+\/\/###visiblesource([\s\S]*)\/\/visiblesource###[\s\S]*$/gi;
    var visibleSrcRex2 = /\/\/###visiblesource([\s\S]*)\/\/visiblesource###/gi;
    var visibleSrcRex = /^[\s\S]+\/\*###visiblesource\*\/([\s\S]*)\/\*visiblesource###\*\/[\s\S]*$/gi;
    var visibleSrcRex2 = /\/\*###visiblesource\*\/([\s\S]*)\/\*visiblesource###\*\//gi;
    var originalData;
    var currentData;
    var currentChangedData;
    var currentBlock;
    var currentChangedBlock;
    var hl;
    var hash;
    var dragObj;
    var activateNode;
    var examplePath = 'examples/';
    var apiPATHPlaceholderCommon = '${XYZ_COMMON_PATH}';
    var apiPATHPlaceholderCore = '${XYZ_CORE_PATH}';
    var apiPATHPlaceholderDisplay = '${XYZ_DISPLAY_PATH}';
    var apiPATHPlaceholderEditor = '${XYZ_EDITOR_PATH}';
    var apiPath;
    var docPath;
    var gt = null;
    var examplecss;


    $.ajax({
        url: 'assets/css/example.css',
        dataType: 'text',
        success: function(cssText) {
            examplecss = cssText;
        }
    });

    function getCookie(name) {
        var cookieName = encodeURIComponent(name) + '=';
        var cookieStart = document.cookie.indexOf(cookieName);
        var cookieValue = null;

        if (cookieStart > -1) {
            var cookieEnd = document.cookie.indexOf(';', cookieStart);
            if (cookieEnd == -1) {
                cookieEnd = document.cookie.length;
            }

            cookieValue = decodeURIComponent(document.cookie.substring(cookieStart + cookieName.length, cookieEnd));
        }

        return cookieValue;
    };

    function setCookie(name, value, days) {
        var cookieText = encodeURIComponent(name) + '=' +
            encodeURIComponent(value);
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            cookieText += '; expires=' + date.toGMTString();
        }

        /* if(path) {
            cookieText += "; path=" + path;
        } else {*/
        cookieText += '; path=/';
        // }

        document.cookie = cookieText;
    };

    var plyid = getCookie('plyid');
    if (!plyid) {
        setCookie('plyid', Math.round(Math.random() * 1000) + ('' + new Date().getTime()).substr(-5), 999);
    }

    playground.utag = function(index) {
        let tag = {};
        let title = gt.data().title;
        switch (index) {
        // download
        case 1:
            tag = {
                link_id: this,
                link_text: 'download:' + title,
                linkEvent: 'download:' + title,
                actionTrack: 'download:' + title
            };
            break;
            // docs
        case 2:
            tag = {
                link_id: this,
                link_text: 'docs:' + title,
                linkEvent: 'docs:' + title,
                actionTrack: 'docs:' + title
            };
            break;
            // run
        case 3:
            tag = {
                link_id: this,
                link_text: 'run:' + title,
                linkEvent: 'run:' + title,
                actionTrack: 'run:' + title
            };
            break;
            // reset
        case 4:
            tag = {
                link_id: this,
                link_text: 'reset:' + title,
                linkEvent: 'reset:' + title,
                actionTrack: 'reset:' + title
            };
            break;
            // js only
        case 5:
            tag = {
                link_id: this,
                link_text: 'js-only:' + title,
                linkEvent: 'js-only:' + title,
                actionTrack: 'js-only:' + title
            };
            break;
            // html n js
        case 6:
            tag = {
                link_id: this,
                link_text: 'html-n-js:' + title,
                linkEvent: 'html-n-js:' + title,
                actionTrack: 'html-n-js:' + title
            };
            break;
            // example list
        case 7:
            tag = {
                link_id: this,
                link_text: title + ':example-list',
                linkEvent: title + ':example-list',
                actionTrack: title + ':example-list'
            };
            break;
        }

        if (window.utag) {
            window.utag.link(tag);
        }
    };

    playground.docs = function(idx) {
        this.utag(idx);
    };

    playground.updatePreview = function(idx) {
        var data = '';

        if (!$('a.tohtml').hasClass('disabled')) {
            // Javascript
            data = currentChangedData.replace(visibleSrcRex2, codeEditor.getValue());
        } else {
            // HTML
            data = codeEditor.getValue();
        }

        attachPage(data);

        if (idx) {
            this.utag(idx);
        }
    };

    function patchMouseEvents() {
        function bubbleIframeMouse(iframe, mouseeventName) {
            var existingOnMouseMove = iframe.contentWindow.onmousemove;

            // suppose no other events handlers attached to window
            iframe.contentWindow['on' + mouseeventName] = function(e) {
                if (existingOnMouseMove) existingOnMouseMove(e);

                var evt = document.createEvent('MouseEvents');
                var boundingClientRect = iframe.getBoundingClientRect();

                evt.initMouseEvent(
                    mouseeventName,
                    true, // bubbles
                    false, // not cancelable
                    window,
                    e.detail,
                    e.screenX,
                    e.screenY,
                    e.clientX + boundingClientRect.left,
                    e.clientY + boundingClientRect.top,
                    e.ctrlKey,
                    e.altKey,
                    e.shiftKey,
                    e.metaKey,
                    e.button,
                    null // no related element
                );

                iframe.dispatchEvent(evt);
            };
        }

        // Get the iframe element we want to track mouse movements on
        var myIframe = document.getElementById('preview');

        // Run it through the function to setup bubbling
        bubbleIframeMouse(myIframe, 'mousemove');
        bubbleIframeMouse(myIframe, 'mouseup');
    }

    function unPatchMouseEvents() {
        function bubbleIframeMouse(iframe, mouseeventName) {
            var existingOnMouseMove = iframe.contentWindow.onmousemove;

            // suppose no other events handlers
            iframe.contentWindow['on' + mouseeventName] = null;
        }

        // Get the iframe element we want to track mouse movements on
        var myIframe = document.getElementById('preview');

        // Run it through the function to setup bubbling
        bubbleIframeMouse(myIframe, 'mousemove');
        bubbleIframeMouse(myIframe, 'mouseup');
    }

    function updateDisplay() {
        var iframe = document.getElementById('preview');
        var disp = iframe.contentWindow.display;
        if (disp) {
            var container = disp.getContainer();
            disp.resize(container.offsetWidth, container.offsetHeight);
        }
    }

    function codeMousemove(e) {
        var dx = e.clientX - evt.clientX;
        var rightNewWidth = rightWidth - dx;

        if (rightNewWidth > 19 && window.innerWidth - rightNewWidth > 9) {
            $('#right').css({width: rightNewWidth});
            $('#vrdrag').css({right: rightNewWidth - 10, left: 'auto'});
            $('#middle').css({right: rightNewWidth});

            updateDisplay();
        }
    }

    function codeMouseup(e) {
        document.removeEventListener('mousemove', codeMousemove);
        document.removeEventListener('mouseup', codeMouseup);
        unPatchMouseEvents();

        // resize map display
        updateDisplay();
    }

    function hideVisiblePlaceholder() {
        var cmMarkOptions = {collapsed: true, css: 'background-color:red', readOnly: true};
        var cValue = codeEditor.getValue();
        var pos1 = codeEditor.posFromIndex(cValue.indexOf(visiblePH1));
        var pos2 = codeEditor.posFromIndex(cValue.indexOf(visiblePH2));

        codeEditor.markText(pos1, {line: pos1.line, ch: pos1.ch + visiblePH1.length}, cmMarkOptions);
        codeEditor.markText(pos2, {line: pos2.line, ch: pos2.ch + visiblePH2.length}, cmMarkOptions);
    }

    window.onresize = function() {
        updateDisplay();
    };

    var evt;
    var rightWidth;
    playground.codeMousedown = function(e) {
        evt = e;
        rightWidth = $('#right').width();

        document.addEventListener('mousemove', codeMousemove);
        document.addEventListener('mouseup', codeMouseup);
        patchMouseEvents();
    };

    var overviewWidth;
    var contentPosition;
    var vdragPosition;
    playground.toggleOverview = function() {
        if ($('#content').css('left') != '0px') {
            // set right value to make middle tag not scale with overview tag
            $('#right').css({width: $('#right').width() + 2});
            $('#middle').css({right: $('#right').width() + 2});
            $('#vrdrag').css({right: $('#right').width() - 8, left: 'auto'});

            overviewWidth = overviewWidth || parseInt($('#overview').css('width'));
            contentPosition = contentPosition || $('#content').position();
            vdragPosition = vdragPosition || $('#vdrag').position();

            $('#vdrag').animate({left: 1}, speed).text('▶');
            $('#overview').animate({left: overviewWidth * -1}, speed, function() {
            }).css({'z-index': 0});
            $('#content').animate({left: 0}, speed);
        } else {
            $('#vdrag').animate({left: vdragPosition.left}, speed).text('◀');
            $('#overview').animate({left: 0}, speed, function() {
            }).css({'z-index': 0});
            $('#content').animate({left: contentPosition.left}, speed);
        }
    };

    playground.toggleMode = function(elem, idx) {
        if (!$(elem).hasClass('disabled')) {
            if ($(elem).hasClass('tohtml')) {
                // save current block
                currentChangedBlock = codeEditor.getValue();

                if (currentChangedBlock) {
                    // switch to html
                    codeEditor.setOption('readOnly', false);
                    codeEditor.setValue(currentChangedData.replace(visibleSrcRex2, visiblePH1 + currentChangedBlock + visiblePH2));
                    $('a.tohtml').addClass('disabled');
                    $('a.tojs').removeClass('disabled');

                    // hide placeholders in code editor
                    hideVisiblePlaceholder();
                }
            } else {
                if (elem != 'click') {
                    // save current Data
                    currentChangedData = codeEditor.getValue();
                }
                currentChangedBlock = currentChangedData.replace(visibleSrcRex, '$1');

                // switch to JS
                codeEditor.setOption('readOnly', false);
                codeEditor.setValue(currentChangedBlock);
                $('a.tohtml').removeClass('disabled');
                $('a.tojs').addClass('disabled');
            }

            codeEditor.clearHistory();
        }

        if (idx) {
            this.utag(idx);
        }
    };

    playground.resetCode = function(idx) {
        if (confirm('Do you really want to reset the example?')) {
            currentChangedBlock = currentBlock;
            currentChangedData = currentData;

            // JS active
            if ($('a.tojs').hasClass('disabled')) {
                codeEditor.setValue(currentBlock);
            } else {
                // HTML active
                codeEditor.setValue(currentData);

                // hide visible placeholders in code editor
                hideVisiblePlaceholder();
            }

            playground.updatePreview();
        }
        this.utag(idx);
    };

    playground.download = function(idx) {
        if (gt) {
            $.get(examplePath + gt.data().file, function() {
                var anchor = document.createElement('a');
                var content = $('a.tohtml').hasClass('disabled') ? codeEditor.getValue() : currentChangedData.replace(visibleSrcRex2, codeEditor.getValue());

                content = content.replace(apiPath.common, absolutePath(apiPath.common));
                content = content.replace(apiPath.core, absolutePath(apiPath.core));
                content = content.replace(apiPath.display, absolutePath(apiPath.display));
                content = content.replace(apiPath.editor, absolutePath(apiPath.editor));
                content = content.replace(visiblePH1, '');
                content = content.replace(visiblePH2, '');

                let examplecsst = examplecss.replace(new RegExp('\n', 'g'), '\n\t\t\t');
                content = content.replace('</style>', examplecsst + '\n\t\t</style>');

                anchor.href = 'data:application/octet-stream,' + encodeURIComponent(content);
                anchor.target = '_blank';
                anchor.download = gt.data().title + '.html';

                var event = document.createEvent('MouseEvents');
                event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);

                anchor.dispatchEvent(event);
            });
        }
        this.utag(idx);
    };

    var linkForPath = document.createElement('a');

    function absolutePath(href) {
        linkForPath.href = href;
        return linkForPath.href;
    }

    function attachCssStyle(frm) {
        frm.onload = function() {
            injectCss(examplecss, frm.contentDocument);
        };
    }

    function updateAPIVersion(build) {
        var versionTag = document.getElementById('version');
        versionTag.innerHTML = 'API Version: ' + build.version;
    }

    function attachPage(data) {
        var oPreviewFrame = document.getElementById('preview');
        var iframeparent = oPreviewFrame.parentNode;
        var previewFrame = document.createElement('iframe');

        iframeparent.removeChild(oPreviewFrame);
        previewFrame.id = 'preview';
        previewFrame.style.width = '100%';
        previewFrame.style.height = '100%';
        previewFrame.style.border = 'none';
        iframeparent.prepend(previewFrame);

        attachCssStyle(previewFrame);

        // try to get offsetWidth of iframe and setTimeout, these are workarounds for the issue taht iframe not ready and map display in this iframe is initialized with a strange width/height
        previewFrame.offsetWidth;

        setTimeout(function() {
            var iframe = (previewFrame.contentWindow) ? previewFrame.contentWindow : (previewFrame.contentDocument.document) ? previewFrame.contentDocument.document : previewFrame.contentDocument;

            iframe.document.open();
            iframe.document.write(data);
            iframe.document.close();

            iframe.onload = function() {
                updateAPIVersion(iframe.window.here.xyz.maps.build);
            };
        }, 0);
    }

    function initTree(node) {
        node = $(node);
        node.find('li ul').each(function(idx, item) {
            var t = $(item).closest('li');
            if (!t.hasClass('collapsed') && !t.hasClass('expanded')) {
                t.addClass('expanded');
            } else if (t.hasClass('collapsed')) {
                t.children('ul').toggle();
            }
        });

        node.click(function(e, n) {
            if ($(e.target).is('ul')) {
                return;
            }

            if (n) {
                e.target = n;
            }

            var p;
            var t = $(e.target).closest('li');
            // if ( !$(e.target).is("span")){
            // if ( p = t.children("ul")){
            // p.toggle("fast",function(){
            // t.toggleClass("collapsed");
            // t.toggleClass("expanded");
            // });
            // }
            // }

            if (hl) {
                hl.removeClass('highlight');
            }
            hl = $(e.target).closest('li').find('span').first();
            hl.addClass('highlight');

            if (t.data().samples) {
                if (p = t.children('ul')) {
                    p.toggle('fast', function() {
                        t.toggleClass('collapsed');
                        t.toggleClass('expanded');
                    });
                }

                // if ( !t.data().file )
                // showInfo( "<h1>"+t.data().title+"</h1><br>"+t.data().description );
                // else{
                // showInfo( t.data().file, true );
                // }
            } else {
                gt = t;
                playground.utag(7);
                location.hash = encodeURI(t.data().root.id + '_' + t.data().title);

                $('.docs').attr('href', docPath + (t.data().docs || t.data().root.docs));

                $.get(examplePath + t.data().file, function(data) {
                    // untouched data
                    originalData = data;

                    data = data.replace(apiPATHPlaceholderCommon, apiPath.common);
                    data = data.replace(apiPATHPlaceholderCore, apiPath.core);
                    data = data.replace(apiPATHPlaceholderDisplay, apiPath.display);
                    data = data.replace(apiPATHPlaceholderEditor, apiPath.editor);

                    currentData = data;
                    currentBlock = data.replace(visibleSrcRex, '$1');

                    currentChangedData = data;
                    showEditor(currentChangedBlock = currentBlock);

                    // filename
                    $('#sampleinfo').html(t.data().description);
                    $('#sampleinfo').attr('title', t.data().description);

                    attachPage(data);

                    // show switch to html btn
                    if ($('a.tohtml').hasClass('disabled')) {
                        playground.toggleMode('click');
                    }
                }).fail(function() {
                    document.getElementById('preview').src = '';
                    codeEditor.setValue('x');
                    showInfo('<h1>Oops, file not found!</h1><br><pre>' + t.data().file + '</pre>');
                });
            }
        });
    }

    function showEditor(t) {
        $('.icnt').hide();
        $('.CodeMirror').show();
        codeEditor.setValue(t);
    }

    function showInfo(t, f) {
        $('#sampleinfo').html('');
        $('#sampleinfo').attr('title', '');

        $('.icnt').show();
        $('.CodeMirror').hide();

        if (f) {
            if (t.substr(0, 4) != 'http') {
                t = examplePath + t;
            }
            $('#info').show().html('<iframe style="width:100%;height:100%;margin:0;border:0" src="' + t + '"></iframe>');
            return;
        }
        $('#info').show().html(t);
    }

    function walkTree(str, node) {
        var n1 = $('<li><span>' + node.title + '</span></li>');
        n1.data(node);

        if (node.samples) {
            var n2 = $('<ul></ul>');
            $.each(node.samples, function(idx, item) {
                item.parent = node;
                item.root = node.root;
                n2 = walkTree(n2, item);
            });
            n1.append(n2);
        }

        if (node.default) {
            activateNode = n1;
        }

        if (hash && node.root.id == hash[0] && encodeURIComponent(node.title) == hash[1]) {
            activateNode = n1;
        }

        str.append(n1);
        return str;
    }

    function sortByOrder(d) {
        d.sort(function(a, b) {
            return (a.order || 0) - (b.order || 0);
        });
    }

    function addCredentialsToGlobal(credentials, global) {
        for (var c in credentials) {
            global[c] = credentials[c];
        }
    }

    // function loading(show){
    // var n = $("body");
    //
    // if (show){
    // if (!n.find(".modal_loading")[0])
    // n.append('<div class="modal_loading"><div class="modal_overlay">&nbsp;</div><div class="loading"></div></div>');
    // n.find(".modal_loading").show();
    // }else{
    // n.find(".modal_loading").hide();
    // }
    // }

    $(document).ready(function() {
        apiPath = pgSettings.path['xyz-maps'];
        docPath = pgSettings.path.doc;

        $('a.htmlmode').data('tg', false);

        // init codemirror
        codeEditor = CodeMirror.fromTextArea(document.getElementById('codeedit'), {
            theme: pgSettings.codeMirror.theme,
            // lineNumbers: true,
            mode: 'javascript'
        });
        codeEditor.setSize('100%', '100%');
        codeEditor.setOption('scrollbarStyle', 'simple');

        var list = $('<ul></ul>');


        let xyzmapsExclude = pgSettings.exclude;
        let xyzmapsExp = [];

        xyzmaps.forEach((exp) => {
            if (!(typeof xyzmapsExclude[exp.id] == 'boolean' && xyzmapsExclude[exp.id])) {
                xyzmapsExp.push(exp);
            }
        });

        // detect hash
        hash = location.hash.substr(1);
        if (hash) {
            hash = hash.split('_');
        }

        sortByOrder(xyzmapsExp);

        $.each(xyzmapsExp, function(idx, item) {
            item.root = item;
            walkTree($('#overview #ovcnt'), item);
        });

        $('.docs').attr('href', docPath + xyzmapsExp[0].docs);

        addCredentialsToGlobal(credentials, window);

        initTree($('#overview #ovcnt')[0]);

        if (activateNode) {
            setTimeout(function() {
                $('#overview #ovcnt').trigger('click', activateNode);
            }, 100);
        }
    });
})();
