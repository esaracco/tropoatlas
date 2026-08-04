import i18n from "../i18n"
import { toast } from "react-toastify"
import { LedsClient } from "@tropo/leds"

const client = new LedsClient({
  onError: (e) => {
    if (!navigator.onLine) return
    console.error(e.message)
    toast.warning(i18n.t("Unable to reach the audio library web server!"), {
      toastId: "audioServerConnectionError",
    })
  },
})

export const setLeds = client.setLeds.bind(client)
export const setRuler = client.setRuler.bind(client)

const leds = {
  setLeds,
  setRuler,
}

export default leds
