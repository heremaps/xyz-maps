export type LibraryComponent = 'common' | 'core' | 'display' | 'editor';
export type Component = LibraryComponent | 'integration';
export type MapMarkup = 'none' | 'plain' | 'sized';

export interface MapPosition {
    x: number;
    y: number;
}

export interface MapDragOptions {
    duration: number;
    button: 'left' | 'middle' | 'right';
    modifiers: ('Alt' | 'Control' | 'Meta')[];
}

declare module 'vitest/internal/browser' {
    interface BrowserCommands {
        mapDrag(selector: string, from: MapPosition, to: MapPosition, options: MapDragOptions): Promise<void>;
        mapWheel(selector: string, position: MapPosition, deltaY: number): Promise<void>;
    }
}
