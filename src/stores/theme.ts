import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
    const currentTheme = ref('default')

    // 切换主题
    const changeTheme = (theme: string) => {
        currentTheme.value = theme
        document.documentElement.setAttribute('data-theme', theme)

        // Element Plus 主题切换逻辑
        // if (theme === 'purple') {
        //     document.documentElement.classList.remove('dark')
        // }
        if (theme === 'default') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    return {
        currentTheme,
        changeTheme
    }
})