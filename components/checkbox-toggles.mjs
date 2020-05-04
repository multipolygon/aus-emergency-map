export default {
  props: ['obj', 'parents'],
  methods: {
    click: function (val) {
      objTreeSetProp(this.obj, '_show', val);
      if (val && this.parents) {
        this.parents.forEach(
          function (p) {
            p._show = true;
          }
        );
      }
    },
  },
};
