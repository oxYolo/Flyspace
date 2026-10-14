import axios from 'axios'
import { ElMessage } from 'element-plus'
import { saveAs } from 'file-saver'
import { getToken } from '@/utils/auth'
import errorCode from '@/utils/errorCode'
import { blobValidate } from '@/utils/ruoyi'
import urlConfig from "@/public-path.ts";

const baseURL = urlConfig.baseUrl

export default {
  zip(url: string, name: string) {
    var url = baseURL + url
    axios({
      method: 'get',
      url: url,
      responseType: 'blob',
      headers: { Authorization: 'Bearer ' + getToken() },
    }).then(async (res) => {
      const isLogin = await blobValidate(res.data)
      if (isLogin) {
        const blob = new Blob([res.data], { type: 'application/zip' })
        this.saveAs(blob, name)
      } else {
        this.printErrMsg(res.data)
      }
    })
  },
  saveAs(text: Blob, name: string, opts?: any) {
    saveAs(text, name, opts)
  },
  async printErrMsg(data: any) {
    const resText = await data.text()
    const rspObj = JSON.parse(resText)
    const errMsg = errorCode[rspObj.code] || rspObj.msg || errorCode['default']
    ElMessage.error(errMsg)
  },
}
