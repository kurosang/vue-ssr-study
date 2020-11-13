import Vue from 'vue'
import Vuex from 'vuex'

import { Book } from './modules/book.js'

Vue.use(Vuex)

export function createStore() {
  return new Vuex.Store({
    modules: {
      book: Book,
    },
    state: {},
    mutations: {},
    actions: {},
  })
}
