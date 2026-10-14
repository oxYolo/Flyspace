import { ref, onMounted } from 'vue';
import { getWeatherList } from "@/api/flyControl/weather";
export function useRightTopModule() {
  const weatherData = ref({
    text: '-',
    precipitation: 0,
    windSpeed: 0,
    pressure: 0,
    temperature: 0,
    windDirection: '-',
    windPower: 0,
    humidity: 0
  });


  const fetchWeatherData = async () => {
    getWeatherList({
      pageNum: 1,
      pageSize: 1
    }).then((res: any) => {
      const result = res.data.records[0]
      weatherData.value = {
        text: result.text,
        precipitation: result.precip,
        windSpeed: result.windSpeed,
        pressure: result.pressure,
        temperature: result.temp,
        windDirection: result.windDir,
        windPower: result.windScale,
        humidity: result.humidity
      }
    })
  };

  onMounted(() => {
    fetchWeatherData();
  });

  return {
    weatherData
  }
}
