import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSidebarStore = defineStore('sidebar', () => {
  const leftOpen = ref(true)
  const rightOpen = ref(true)

  const toggleLeft = () => {
    leftOpen.value = !leftOpen.value
  }

  const toggleRight = () => {
    rightOpen.value = !rightOpen.value
  }

  const setLeftOpen = (open: boolean) => {
    leftOpen.value = open
  }

  const setRightOpen = (open: boolean) => {
    rightOpen.value = open
  }

  return {
    leftOpen,
    rightOpen,
    toggleLeft,
    toggleRight,
    setLeftOpen,
    setRightOpen
  }
})
