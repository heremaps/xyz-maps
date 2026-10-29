import {vi, describe, it} from 'vitest';
import {getCanvasPixelColor} from 'utils';

describe('canvas pixel color sampling', () => {
    function canvasFixture() {
        const element = document.createElement('div');
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 1;
        element.appendChild(canvas);
        const context = canvas.getContext('2d');
        context.fillStyle = '#ff0000';
        context.fillRect(0, 0, 2, 1);
        return {element, context};
    }

    it('reads once without an expected color', async () => {
        const {element} = canvasFixture();
        chai.expect(await getCanvasPixelColor(element, {x: 0, y: 0}, {delay: 0})).to.equal('#ff0000');
    });

    it('returns the last sample when the retry budget is exhausted', async () => {
        const {element, context} = canvasFixture();
        const read = vi.spyOn(context, 'getImageData');
        try {
            const color = await getCanvasPixelColor(element, {x: 0, y: 0}, {
                expect: '#0000ff', retry: 2, delay: 0, retryDelay: 0
            });
            chai.expect(color).to.equal('#ff0000');
            chai.expect(read.mock.calls.length).to.equal(3);
        } finally {
            read.mockRestore();
        }
    });

    it('does not combine matching pixels from different samples', async () => {
        const {element, context} = canvasFixture();
        let reads = 0;
        const values = [[255, 0, 0], [255, 255, 255], [255, 255, 255], [0, 0, 255]];
        const read = vi.spyOn(context, 'getImageData').mockImplementation(() => {
            return new ImageData(new Uint8ClampedArray([...values[reads++], 255]), 1, 1);
        });
        try {
            const colors = await getCanvasPixelColor(element, [{x: 0, y: 0}, {x: 1, y: 0}], {
                expect: ['#ff0000', '#0000ff'], retry: 1, delay: 0, retryDelay: 0
            });
            chai.expect(colors).to.deep.equal(['#ffffff', '#0000ff']);
            chai.expect(reads).to.equal(4);
        } finally {
            read.mockRestore();
        }
    });

    it('stops polling when the expected predicate matches', async () => {
        const {element, context} = canvasFixture();
        let samples = 0;
        const color = await getCanvasPixelColor(element, {x: 0, y: 0}, {
            delay: 0,
            retryDelay: 0,
            retry: 2,
            expect: (colors) => {
                samples++;
                if (colors[0] === '#0000ff') return true;
                context.fillStyle = '#0000ff';
                context.fillRect(0, 0, 2, 1);
                return false;
            }
        });
        chai.expect(color).to.equal('#0000ff');
        chai.expect(samples).to.equal(2);
    });
});
