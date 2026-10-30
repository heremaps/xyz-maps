export type LibraryComponent = 'common' | 'core' | 'display' | 'editor';
export type Component = LibraryComponent | 'integration';
export type MapMarkup = 'none' | 'plain' | 'sized';

export interface LibraryBundle {
    component: LibraryComponent;
    name: string;
    code: string;
}

export interface XYZGlobalNamespace {
    xyz?: {
        maps?: Partial<
            Pick<typeof import('@here/xyz-maps-core'), 'TileLayer'> &
            Pick<typeof import('@here/xyz-maps-display'), 'Map'>
        > & {
            // JSUtils is internal and absent from the published Common declarations.
            common?: {JSUtils?: {extend?: unknown}};
            editor?: Partial<Pick<typeof import('@here/xyz-maps-editor'), 'Editor'>>;
        };
    };
}
