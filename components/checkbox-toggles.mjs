import { objTreeSetProp } from './utils.mjs';

export default {
    props: ['obj', 'parents'],
    methods: {
        click(val) {
            objTreeSetProp(this.obj, '_show', val);
            if (val && this.parents) {
                this.parents.forEach(function(p) {
                    p._show = true;
                });
            }
        },
    },
};
