import { ActionContext, ActionPayload } from "vuex";

interface UserState {
  name: string;
  roomId: string;
}

const getDefaultState = (): UserState => {
  return {
    name: "",
    roomId: ""
  };
};

const state = getDefaultState();

const mutations = {
  SET_INFO: (state: UserState, value: UserState) => {
    const { name, roomId } = value;
    state.name = name;
    state.roomId = roomId;
    window.localStorage.setItem("name", name);
    window.localStorage.setItem("roomId", roomId);
  }
};

const actions = {
  login({ commit }: ActionContext<UserState, UserState>, info: ActionPayload) {
    commit("SET_INFO", info);
  }
};

export default {
  namespaced: true,
  state,
  mutations,
  actions
};
