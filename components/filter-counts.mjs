export default {
  props: ['obj', 'resources', 'cls'],
  computed: {
    count_hidden: function () {
      return (this.obj._count_all || 0) - (this.obj._count || 0);
    },
  },
};
