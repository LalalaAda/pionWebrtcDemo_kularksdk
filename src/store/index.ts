import Vue from "vue";
import Vuex, { StoreOptions } from "vuex";
import user from "./modules/user";

Vue.use(Vuex);

export default new Vuex.Store({
  state: {},
  mutations: {},
  actions: {},
  modules: {
    user
  }
} as StoreOptions<unknown>);
