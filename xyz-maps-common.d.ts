import { GeoJSONBBox } from '@here/xyz-maps-core';

export declare namespace Color {
    /**
     * @hidden
     */
    export type RGBA = [number, number, number, number?];
    /**
     * @hidden
     */
    export type Color = string | RGBA | number;
    /**
     * @hidden
     */
    const toRGB: (color: Color, ignoreNumbers?: boolean) => RGBA;

}

/**
 * Expression
 * @hidden
 */
export declare abstract class Expression implements IExpression {


    /**
     * @hidden
     */
    static isExpression(exp: any): boolean;

    /**
     * @hidden
     */
    protected env: ExpressionParser;
    /**
     * @hidden
     */
    json: JSONExpression;



    /**
     * @hidden
     */
    dynamic(context: Context, start?: number, step?: number, stop?: number): false | Expression;
    /**
     * @hidden
     */
    protected compileOperand(index: number): any;
    /**
     * @hidden
     */
    operand(index: number, context?: any): any;



}

export declare enum ExpressionMode {
    static = 0,
    dynamic = 1
}

/**
 * @hidde
 */
export declare class ExpressionParser {
    /**
     * @hidde
     */
    static isJSONExp(exp: any): boolean;


    /**
     * @hidden
     */
    static Expressions: {
        [op: string]: new (e: JSONExpression, p: ExpressionParser) => Expression & {
            [K in keyof typeof Expression]: typeof Expression[K];
        };
    };


    /**
     * @hidden
     */
    context: Context;








    /**
     * @hidden
     * @param exp
     * @param context
     * @param mode
     * @param cache
     */
    evaluate(exp: Def, context: Context, mode?: ExpressionMode, cache?: any): any;







    /**
     * @hidden
     * @param mode
     * @param cache
     */
    setMode(mode: ExpressionMode, cache?: Cache_2<Expression>): void;

}

/**
 * LRU Cache
 * @hidden
 */
export declare class LRU<TYPE> {













}

/**
 * TaskManager
 * @hidden
 */
export declare const TaskManager: {
    getInstance: (time?: number) => TaskManager_2;
    createInstance: (time?: number) => TaskManager_2;
    active: boolean;
};

declare namespace vec3 {
    export {
        Vec3,
        sub,
        add,
        multiply,
        length_2 as length,
        scale,
        normalize,
        cross,
        transform,
        dot
    }
}
export { vec3 }

export { }
