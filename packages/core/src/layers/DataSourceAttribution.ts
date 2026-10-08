/**
 * Represents a structured attribution entry for a data source.
 *
 * Used to provide detailed attribution information for map layers, supporting clickable labels and optional tooltips.
 */
export type DataSourceAttribution = {
    /**
     * The text label displayed in the attribution control.
     */
    label: string;
    /**
     * (Optional) A URL that opens when the label is clicked.
     */
    url?: string;
    /**
     * (Optional) Tooltip shown on hover over the label.
     */
    title?: string;
}
