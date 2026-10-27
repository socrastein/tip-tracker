import { reactive } from "vue";

// Used for passing
const state = reactive({
  showAddTipForm: false,
  isBeingEdited: false,
  tipObject: null,
  clear() {
    this.showAddTipForm = false;
    this.isBeingEdited = false;
    this.tipObject = null;
  },
});

export default state;
