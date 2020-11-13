import Vue from 'vue'

const getBookFromBackendApi = (id) =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ name: '《地球往事》', price: 100 })
    }, 300)
  })

export const Book = {
  namespaced: true,

  state: {
    items: {},
  },

  actions: {
    fetchItem({ commit }, id) {
      return getBookFromBackendApi(id).then((item) => {
        commit('setItem', { id, item })
      })
    },
  },

  mutations: {
    setItem(state, { id, item }) {
      Vue.set(state.items, id, item)
    },
  },
}
