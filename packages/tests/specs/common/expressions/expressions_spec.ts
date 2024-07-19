/*
 * Copyright (C) 2019-2024 HERE Europe B.V.
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

import {JSONExpression, ExpressionMode, ExpressionParser} from '@here/xyz-maps-common';

describe('Expressions', function() {
    const {expect} = chai;

    function expectExpression(type: string, exp: any) {
        expect(exp).to.be.an('object');
        expect(exp.json).to.be.an('array');
        expect(exp.json[0]).equals(type);
    }


    const definitions = {
        'object': ['literal', {'prop': 'value'}]
    };
    const environment = {
        $zoom: 14,
        zoom: 14.5,
        $geometryType: 'point',
        $id: 'id1',
        $layer: 'testLayer'
    };

    let exprParser = new ExpressionParser(definitions, environment);

    const context = {aName: 'testName', aNumber: 123, aString: 'testString'};
    const evalExpression = (exp: JSONExpression, mode = ExpressionMode.static, ctx=context) => {
        return exprParser.evaluate(exp, ctx, mode);
    };

    it('evaluate simple sum expression', async () => {
        const result = evalExpression(['+', 1, 2]);
        expect(result).to.equal(3);
    });

    it('evaluate sum expression, expression operand', async () => {
        const result = evalExpression(['+', 1, ['get', 'aNumber']]);
        expect(result).to.equal(124);
    });

    it('evaluate sum expression, dynamic expression operand', async () => {
        const result = evalExpression(['+', 1, ['zoom']]);
        expect(result).to.equal(15.5);
    });

    it('(dynamic) evaluate sum expression, dynamic expression operand', async () => {
        const result = evalExpression(['+', 1, ['zoom']], ExpressionMode.dynamic);
        expectExpression('+', result);
    });

    it('evaluate simple subtract expression', async () => {
        const result = evalExpression(['-', 3, 1]);
        expect(result).to.equal(2);
    });

    it('evaluate simple get', async () => {
        const result = evalExpression(['get', 'aName']);
        expect(result).to.equal('testName');
    });

    it('evaluate get environment variable', async () => {
        const result = evalExpression(['get', '$zoom']);
        expect(result).to.equal(environment.$zoom);
    });

    it('evaluate get custom object variable', async () => {
        const result = evalExpression(['get', 'prop', ['ref', 'object']]);
        expect(result).to.equal('value');
    });

    it('evaluate case expression: condition 1', async () => {
        const result = evalExpression(['case', ['==', 2, 2], 111, ['==', 2, 2], ['zoom'], 0]);
        expect(result).to.equal(111);
    });

    it('evaluate case expression: condition 2', async () => {
        const result = evalExpression(['case', ['==', 1, 2], 111, ['==', 2, 2], 222, 0]);
        expect(result).to.equal(222);
    });

    it('evaluate case expression: condition 2, evaluated expr result', async () => {
        const result = evalExpression(['case', ['==', 1, 2], 111, ['==', 2, 2], ['get', 'aNumber'], 0]);
        expect(result).to.equal(context.aNumber);
    });

    it('(dynamic) evaluate case expression: dynamic condition', async () => {
        const result = evalExpression(['case', ['==', 1, 2], 111, ['==', 2, ['zoom']], 222, 0], ExpressionMode.dynamic);
        expectExpression('case', result);
    });

    it('evaluate case expression: dynamic expression result', async () => {
        const result = evalExpression(['case', ['==', 1, 2], 111, ['==', 2, 2], ['zoom'], 0]);
        expect(result).to.equal(environment.zoom);
    });

    it('(dynamic) evaluate case expression: dynamic expression result', async () => {
        const result = evalExpression(['case', ['==', 1, 2], 111, ['==', 2, 2], ['zoom'], 0], ExpressionMode.dynamic);
        expectExpression('zoom', result);
    });

    it('evaluate nested case expressions', async () => {
        let jsonExp = ['case',
            ['!=', ['zoom'], 14.5], 555,
            ['!=', 2, 1], ['case', ['==', ['zoom'], 1], 333, 'case2Fallback'],
            'case1Fallback'
        ];
        const result = evalExpression(jsonExp);
        expect(result).to.equal('case2Fallback');
    });

    it('(dynamic) evaluate nested case expressions', async () => {
        let jsonExp = ['case',
            ['!=', ['zoom'], 14.5], 555,
            ['!=', 2, 1], ['case', ['==', ['zoom'], 1], 333, 'case2Fallback'],
            'case1Fallback'
        ];
        const result = evalExpression(jsonExp, ExpressionMode.dynamic);
        expectExpression('case', result);
        expect(result.json[result.json.length - 1]).to.equal('case1Fallback');
    });

    it('(dynamic) evaluate nested case expressions, partial result', async () => {
        let jsonExp = ['case',
            ['!=', 1, 1], 555,
            ['!=', 2, 1], ['case', ['==', ['zoom'], 1], 333, 'case2Fallback'],
            'case1Fallback'
        ];
        const result = evalExpression(jsonExp, ExpressionMode.dynamic);
        expectExpression('case', result);
        expect(result.json[result.json.length - 1]).to.equal('case2Fallback');
    });

    it('evaluate interpolate expression', async () => {
        const value = 18;
        const result = evalExpression(['interpolate', ['linear'], value, 3, 0, 3, 10, 3, 4, 5, 5, 17, 64, 19, 19, 22, 22]);
        expect(result).to.equal(41.5);
    });

    it('evaluate interpolate expression with expression value', async () => {
        const value = ['zoom'];
        const result = evalExpression(['interpolate', ['linear'], value, 3, 0, 3, 10, 3, 4, 5, 1, 17, 64, 19, 19, 22, 22]);
        expect(result).to.equal(50.875);
    });

    it('(dynamic) evaluate interpolate', async () => {
        const value = 18;
        const result = evalExpression(['interpolate', ['linear'], value, 3, 0, 3, 10, 3, 4, 5, 5, 17, 64, 19, 19, 22, 22], ExpressionMode.dynamic);
        expect(result).to.equal(41.5);
    });

    it('(dynamic) evaluate interpolate expression with expression value', async () => {
        const value = ['zoom'];
        const result = evalExpression(['interpolate', ['linear'], value, 3, 0, 3, 10, 3, 4, 5, 5, 17, 64, 19, 19, 22, 22], ExpressionMode.dynamic);
        expectExpression('interpolate', result);
    });

    it('(dynamic) evaluate partially case expression', async () => {
        const exp = ['case',
            ['get', 'prop'],
            ['zoom'],
            0
        ];
        const result = evalExpression(exp, ExpressionMode.dynamic, {prop: true});
        console.log(result);
        expectExpression('zoom', result);
        // expect(result).to.equal(666);
    });

    it('(dynamic) evaluate nested partially case expression', async () => {
        const exp = ['case',
            ['get', 'prop'],
            ['zoom'],
            0
        ];
        const result = evalExpression(['*', exp, 2], ExpressionMode.dynamic, {prop: true});
        console.log(result);
        expectExpression('*', result);
        expectExpression('zoom', result.json[1]);
    });
    it('(dynamic) evaluate multiply-exp with deeply nested partially case expression', async () => {
        const exp = ['case',
            ['get', 'prop'],
            ['zoom'],
            0
        ];
        const result = evalExpression(['*', ['*', exp, 2], 3], ExpressionMode.dynamic, {prop: true});
        console.log(result);
        expectExpression('*', result);
        expectExpression('*', result.json[1]);
        expectExpression('zoom', result.json[1].json[1]);
    });

    it('(dynamic) evaluate compare-exp with deeply nested partially case expression 2', async () => {
        const exp = ['case',
            ['get', 'prop'],
            ['zoom'],
            0
        ];
        const result = evalExpression(['==', exp, environment.zoom], ExpressionMode.dynamic, {prop: true});
        expectExpression('==', result);
        expectExpression('zoom', result.json[1]);
    });


    it('(dynamic) evaluate with multiple deeply nested partially case expressions', async () => {
        const exp = ['case',
            ['zoom'],
            ['==', ['case', ['get', 'prop'], ['zoom'], 0], environment.zoom],
            null
        ];
        const result = evalExpression(exp, ExpressionMode.dynamic, {prop: true});
        expectExpression('case', result);
        expectExpression('zoom', result.json[1]);
        expectExpression('==', result.json[2]);
        expectExpression('zoom', result.json[2].json[1]);
    });

    it('(dynamic) evaluate case expressions with unreachable condition', async () => {
        const exp = ['case', false, ['zoom'], null];
        const result = evalExpression(exp, ExpressionMode.dynamic);
        expect(result).to.equal(null);
    });

    it('(dynamic) evaluate case expressions with unreachable condition and dynamic fallback', async () => {
        const exp = ['case', false, ['zoom'],
            ['==', ['case', ['get', 'prop'], ['zoom'], 0], environment.zoom]
        ];
        const result = evalExpression(exp, ExpressionMode.dynamic);
        expectExpression('==', result);
        expectExpression('zoom', result.json[1]);
    });

    it('(dynamic) evaluate case expressions with interpolate fallback', async () => {
        const exp = ['case',
            // ["==", ["get", "surface"], "unpaved"], ["interpolate", ["linear"], ["zoom"], 0, 0.7, 20, 216.85],
            ['get', 'notavailable'],
            ['interpolate', ['linear'], ['zoom'], 1, 1, 10, 100],
            ['interpolate', ['linear'], ['zoom'], 2, 2, 20, 200]
        ];
        const result = evalExpression(exp, ExpressionMode.dynamic);
        expectExpression('interpolate', result);
        // expectExpression('zoom', result.json[1]);
    });


    it('step expression', async () => {
        const exp= ['step', 15, 1, 10, 2, 100, 0];
        const result = evalExpression(exp);
        expect(result).to.equal(2);
    });

    it('(dynamic) step expression', async () => {
        const exp=['step', ['zoom'], 1, 10, 2, 100, 0];
        const result = evalExpression(exp, ExpressionMode.dynamic);
        expectExpression('step', result);
    });


    it('match expression label', async () => {
        const exp=['match', 'value',
            'label1', 'result1',
            'value', 'result2',
            'fallback'
        ];
        const result = evalExpression(exp);
        expect(result).to.equal('result2');
    });

    it('match expression fallback', async () => {
        const exp=['match', 'value',
            'label1', 'result1',
            'label2', 'result2',
            'fallback'
        ];
        const result = evalExpression(exp);
        expect(result).to.equal('fallback');
    });

    it('(dynamic) match expression dynamic value', async () => {
        const exp=['match', ['zoom'],
            'label1', 'result1',
            'label2', 'result2',
            environment.zoom, 'result3',
            'fallback'
        ];
        const result = evalExpression(exp, ExpressionMode.dynamic);
        expectExpression('match', result);
    });
});
