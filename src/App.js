import React, { useState, useEffect } from 'react';
import './App.css';
import { FaExclamationCircle, FaChartLine, FaMapMarkerAlt, FaTachometerAlt, FaWind, FaEye, FaCloud, FaSun, FaMoon } from 'react-icons/fa';

const API_KEY = '82c64fe267e32fca1a228e088faf5033';

const App = () => {
  const [city, setCity] = useState('');
  const [inputCity, setInputCity] = useState('');
  const [cityOffset, setCityOffset] = useState(0);
  const [weatherData, setWeatherData] = useState(null);
  const [units, setUnits] = useState('metric');
  const [loading, setLoading] = useState(true);
  const [forecastData, setForecastData] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentlySearched, setRecentlySearched] = useState([
    { name: 'Delhi, India', temp: '', description: '' },
    { name: 'New York, USA', temp: '', description: '' },
  ]);
  
const renderRainAnimation = () => {
    if (weatherData && weatherData.weather[0].main.toLowerCase().includes('rain')) {
        const rainCondition = weatherData.weather[0].description.toLowerCase();
        let speedClass = '';

        if (rainCondition.includes('light')) {
            speedClass = 'light-rain';
        } else if (rainCondition.includes('moderate')) {
            speedClass = 'moderate-rain';
        } else if (rainCondition.includes('heavy')) {
            speedClass = 'heavy-rain';
        }

        const generateRaindrops = (layer) => {
            return Array.from({ length: 100 }).map((_, index) => {
                const randomDelay = Math.random() * 2;
                const randomLeft = Math.random() * 100;

                return (
                    <div 
                        key={`${layer}-${index}`} 
                        className="raindrop" 
                        style={{ 
                            left: `${randomLeft}vw`,
                            animationDelay: `${randomDelay}s`,
                        }} 
                    />
                );
            });
        };

        return (
            <div className={`rain-container ${speedClass}`}>
                {/* Layer 1 */}
                <div className="rain-layer">
                    {generateRaindrops(1)}
                </div>
                <div className="rain-layer">
                    {generateRaindrops(2)}
                </div>
            </div>
        );
    }
    return null;
}; 

const getTimeOfDay = (offset) => {
  const utcTime = Date.now();
  const locationTime = new Date(utcTime); // Apply the timezone offset
  const hour = locationTime.getHours(); // Get the hour in local time

  console.log("UTC Time:", utcTime);
  console.log("Hour:", hour);

  if (hour >= 5 && hour < 12) {
      return 'day';
  } else if (hour >= 12 && hour < 17) {
      return 'afternoon';
  } else if (hour >= 17 && hour < 21) {
      return 'evening';
  } else {
      return 'night';
  }
};



const fetchWeather = async (city, lat, lon) => {
  let weatherAPI, forecastAPI;

  if (city) {
    weatherAPI = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
    forecastAPI = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`;
  } else if (lat && lon) {
    weatherAPI = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
    forecastAPI = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`;
  }

  try {
    setLoading(true);

    // Fetch current weather data
    const weatherResponse = await fetch(weatherAPI);
    const weatherData = await weatherResponse.json();

    if (weatherData.cod === 200) {
      setWeatherData(weatherData);

      const timezoneOffset = weatherData.timezone; // Extract timezone offset in seconds
      setCityOffset(timezoneOffset); // Update the offset for live location time

      const timeOfDay = getTimeOfDay(timezoneOffset); // Pass the timezone offset here
      const weatherCondition = weatherData.weather[0].main.toLowerCase();
      const backgroundImage = getWeatherImage(weatherCondition, timeOfDay);
      document.body.style.backgroundImage = `url(${backgroundImage})`;

      // Fetch forecast data
      const forecastResponse = await fetch(forecastAPI);
      const forecastData = await forecastResponse.json();

      if (forecastData.cod === '200' && forecastData.list && forecastData.list.length > 0) {
        const dailyForecasts = forecastData.list.reduce((acc, entry) => {
          const date = new Date(entry.dt * 1000).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = {
              temp: Math.round(entry.main.temp),
              description: entry.weather[0].description,
              high: Math.round(entry.main.temp_max),
              low: Math.round(entry.main.temp_min),
              date: date,
            };
          }
          return acc;
        }, {});

        setForecastData(Object.values(dailyForecasts).slice(0, 5));
        setCity(city || forecastData.city.name);
        await updateRecentlySearched(city || forecastData.city.name, weatherData);
      } else {
        console.error('Error fetching forecast data:', forecastData.message);
      }
    } else {
      console.error('Error fetching current weather data:', weatherData.message);
      setWeatherData(null);
    }

    setLoading(false);
  } catch (error) {
    console.error('Fetch error:', error);
    setLoading(false);
  }
};

const updateRecentlySearched = async (cityName, currentWeather) => {
    const newSearch = {
      name: cityName,
      temp: `${Math.round(currentWeather.main.temp)}°`,
      description: currentWeather.weather[0].description,
    };

    setRecentlySearched(prev => {
      const updatedSearch = [newSearch, ...prev.filter(item => item.name !== newSearch.name)].slice(0, 2);
      return updatedSearch;
    });
};

const fetchRecentCitiesWeather = async () => {
    try {
      const updatedCities = await Promise.all(
        recentlySearched.map(async (location) => {
          const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location.name}&appid=${API_KEY}&units=metric`);
          const data = await response.json();
          if (data.cod === 200) {
            return {
              name: location.name,
              temp: `${Math.round(data.main.temp)}°`,
              description: data.weather[0].description,
            };
          } else {
            console.error(`Error fetching data for ${location.name}: ${data.message}`);
            return location; // Keep the initial city name if fetch fails
          }
        })
      );
      setRecentlySearched(updatedCities);
    } catch (error) {
      console.error("Error fetching recent cities' weather data:", error);
    }
};

useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchWeather('', latitude, longitude); 
      },
    );
}, [units]); 

useEffect(() => {
    fetchRecentCitiesWeather(); 
}, []); 

const weatherImages = {
        clear: {
          day: 'https://imgur.com/IUk42lM.png',
          afternoon: 'https://imgur.com/q6t6ptQ.png',
          evening: 'https://imgur.com/YWU1GuA.png',
          night: 'https://imgur.com/L92szpF.png',
        },
        cloudy: {
            few: 'https://imgur.com/pjNwJX0.png',
            scattered: 'https://imgur.com/g7xc2z7.png',
            broken: 'https://imgur.com/N6XPp0z.png',
            overcast: 'https://imgur.com/fgvy2BA.png',
        },
        rain: {
          light: 'https://imgur.com/m0gMBXV.png',
          moderate: 'https://imgur.com/m0gMBXV.png',
          heavy: 'https://imgur.com/m0gMBXV.png',
          veryHeavy: 'https://imgur.com/m0gMBXV.png',
          extreme: 'https://imgur.com/m0gMBXV.png',
          freezing: 'https://imgur.com/m0gMBXV.png',
          shower: 'https://imgur.com/m0gMBXV.png',
          default: 'https://imgur.com/m0gMBXV.png',
        },
        snow: {
            light: 'https://imgur.com/8RMTnVI.png',
            moderate: 'https://imgur.com/4s8HrsR.png',
            heavy: 'https://imgur.com/pJL05JT.png',
            sleet: 'https://imgur.com/dB1NW5Kpng',
        },
        mist: 'https://imgur.com/ZLXD77B.png',
        fog: 'https://imgur.com/Zu7OG3q.png',
        dust: 'https://imgur.com/I2kVzKq.png',
        sand: 'https://imgur.com/SEheaPG.png',
        ash: 'https://imgur.com/KUSLKof.png',
        squall: 'https://imgur.com/edmScn3.png',
        tornado: 'https://imgur.com/uTGirxm.png',
        haze: 'https://imgur.com/K8olMNz.png',
        smoke:'https://imgur.com/IDarnHH.png',
        thunderstorm: {
            lightRain: 'https://imgur.com/GlwdxHi.png',
            rain: 'https://imgur.com/bArLcQa.png',
            heavyRain: 'https://imgur.com/CXRhOvi.png',
            lightSnow: 'https://imgur.com/FsVKOqB.png',
            snow: 'https://imgur.com/G40H7Lx.png',
            general: 'https://imgur.com/JX2dgS8.png',
        },
        other: {
            drizzle: 'https://imgur.com/m0gMBXV.png',
        },
};

const getWeatherImage = (weatherCondition, description) => {
      const timeOfDay = getTimeOfDay(); // Get the current time of day
  
      switch (weatherCondition.toLowerCase()) {
        case 'clear':
            return weatherImages.clear[timeOfDay] || weatherImages.clear.day;
  
          case 'clouds':
            const description = weatherData?.weather[0]?.description; // Get the description safely
            switch (description?.toLowerCase().trim()) { // Adding trim to remove any extra spaces
                case 'few clouds':
                    return weatherImages.cloudy?.few ;
                case 'scattered clouds':
                    return weatherImages.cloudy?.scattered ;
                case 'broken clouds':
                    return weatherImages.cloudy?.broken ;
                case 'overcast clouds':
                    return weatherImages.cloudy?.overcast ;
                default:
                    return 'https://imgur.com/FbnBasB.png';
            }
        
          case 'rain':
            const rainDescription = weatherData?.weather[0]?.description; // Get the description safely
            switch (rainDescription?.toLowerCase().trim()) { 
                case 'light rain':
                    return weatherImages.rain.light || weatherImages.rain.default;
                case 'moderate rain':
                    return weatherImages.rain.moderate || weatherImages.rain.default;
                case 'heavy rain':
                    return weatherImages.rain.heavy || weatherImages.rain.default;
                case 'very heavy rain':
                    return weatherImages.rain.veryHeavy || weatherImages.rain.default;
                case 'extreme rain':
                    return weatherImages.rain.extreme || weatherImages.rain.default;
                case 'freezing rain':
                    return weatherImages.rain.freezing || weatherImages.rain.default;
                case 'shower rain':
                    return weatherImages.rain.shower || weatherImages.rain.default;
                default:
                    return weatherImages.rain.default;
            }
          
        case 'snow':
            const snowDescription = weatherData?.weather[0]?.description; // Get the description safely
            switch (snowDescription?.toLowerCase().trim()) {
                case 'light snow':
                    return weatherImages.snow.light ;
                case 'moderate snow':
                    return weatherImages.snow.moderate ;
                case 'heavy snow':
                    return weatherImages.snow.heavy ;
                case 'sleet':
                    return weatherImages.snow.sleet ;
                default:
                    return 'https://imgur.com/t2HUmJp.png';
            }
        
        case 'thunderstorm':
            const thunderstormDescription = weatherData?.weather[0]?.description; // Get the description safely
            switch (thunderstormDescription?.toLowerCase().trim()) {
                case 'light rain':
                    return weatherImages.thunderstorm.lightRain  ;
                case 'rain':
                    return weatherImages.thunderstorm.rain ;
                case 'heavy rain':
                    return weatherImages.thunderstorm.heavyRain  ;
                case 'light snow':
                    return weatherImages.thunderstorm.lightSnow  ;
                case 'snow':
                    return weatherImages.thunderstorm.snow ;
                default:
                    return 'https://imgur.com/JX2dgS8.png';
            }
            
  
          case 'mist':
              return weatherImages.mist ;
  
          case 'fog':
              return weatherImages.fog  ;
  
          case 'dust':
              return weatherImages.dust  ;
  
          case 'sand':
              return weatherImages.sand ;
  
          case 'ash':
              return weatherImages.ash  ;
  
          case 'squall':
              return weatherImages.squall ;
  
          case 'tornado':
              return weatherImages.tornado ;

          case 'haze':
              return weatherImages.haze  ;
  
          case 'drizzle':
              return weatherImages.other.drizzle  ;

          case 'smoke':
          return weatherImages.smoke  ;
  
          default:
              return 'https://imgur.com/IUk42lM.png';
      }
};
  
const handleSearch = async (e) => {
  if (e.key === 'Enter') {
    await fetchWeather(inputCity); // Fetch weather and update cityOffset automatically
    setCity(inputCity); // Update city state with the input
  }
};

const useLiveLocationTime = (offset) => {
  const [locationTime, setLocationTime] = useState('');

  const updateLocationTime = () => {
    const utcTime = new Date(); // Current UTC time
    const localTime = new Date(utcTime.getTime() + offset * 1000); // Apply the offset in seconds

    // Set the time display as GMT/UTC with offset applied
    setLocationTime(localTime.toUTCString()); // Display in UTC format
  };

  useEffect(() => {
    updateLocationTime(); // Initialize the time
    const interval = setInterval(updateLocationTime, 1000); // Update every second
    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [offset]); // Effect re-runs when offset changes

  console.log("Location time:", locationTime);
  return locationTime;
  
};

const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
};


  console.log(weatherData?.weather[0]?.main.toLowerCase());


  const liveTime = useLiveLocationTime(cityOffset);

  return (
    <div className="container">
      {renderRainAnimation()}
      <div className="sidebar">
        <h1>SkyTrack</h1>
        <div className="status">
          <span id="status-text">STATUS</span>
          <div className="details">
            <span className="icon">
              <FaExclamationCircle />
            </span>
            <span>{weatherData ? `${weatherData.main.humidity}%` : '---'}</span>
          </div>
          <div className="details">
            <span className="icon">
              <FaChartLine />
            </span>
            <span>{weatherData ? `Feels like ${Math.round(weatherData.main.feels_like)}°` : '---'}</span>
          </div>
          <div className="details">
            <span className="icon">
              <FaTachometerAlt />
            </span>
            <span>{weatherData ? `${weatherData.main.pressure} hPa` : '---'}</span>
          </div>
          <div className="details">
            <span className="icon">
              <FaWind />
            </span>
            <span>{weatherData ? `${Math.round(weatherData.wind.speed)} m/s` : '---'}</span>
          </div>
          <div className="details">
            <span className="icon">
              <FaEye />
            </span>
            <span>{weatherData ? `${weatherData.visibility / 1000} km` : '---'}</span>
          </div>
          <div className="details">
            <span className="icon">
              <FaCloud />
            </span>
            <span>{weatherData ? `${weatherData.clouds.all}%` : '---'}</span>
          </div>
          <div className="details">
            <span className="icon">
              <FaSun />
            </span>
            <span>
              {weatherData && weatherData.sys && weatherData.sys.sunrise
                ? `Sunrise: ${new Date(weatherData.sys.sunrise * 1000).toLocaleTimeString()}`
                : 'Sunrise: ---'}
            </span>
          </div>
          <div className="details">
            <span className="icon">
              <FaMoon />
            </span>
            <span>
              {weatherData && weatherData.sys && weatherData.sys.sunset
                ? `Sunset: ${new Date(weatherData.sys.sunset * 1000).toLocaleTimeString()}`
                : 'Sunset: ---'}
            </span>
          </div>
        </div>
      </div>

      <div className="main-content">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            <div className="header">
              <div className="header">
              <div className="location">
                  <span>{capitalizeFirstLetter(city)} : </span>
                  <span>{liveTime}</span>
              </div>
              </div>
              <div className="actions">
                <input 
                  type="text" 
                  placeholder="Search city" 
                  value={inputCity} 
                  onKeyDown={handleSearch} 
                  onChange={(e) => setInputCity(e.target.value)} 
                  className="search-input" 
                />
                <button className="search-button">
                </button>
              </div>
            </div>
            <div className="weather-info">
              <div className="temperature-container">
                <p className="temperature">
                  {weatherData ? `${Math.round(weatherData.main.temp)}°` : '---'}
                </p>
                <div className="temp-range">
                  <div className="temp-range-card">
                    <div className="high-temp">
                      {weatherData ? `H: ${Math.round(weatherData.main.temp_max)}°` : '---'}
                    </div>
                  </div>
                  <div className="temp-range-card">
                    <div className="low-temp">
                      {weatherData ? `L: ${Math.round(weatherData.main.temp_min)}°` : '---'}
                    </div>
                  </div>
                </div>
              </div>
              <p className="condition">{weatherData ? weatherData.weather[0].description : '---'}</p>
            </div>



            <div className="forecast">
              {forecastData.map((day, index) => (
                <div key={index} className={`day ${index === 3 ? 'wednesday' : ''}`}>
                  <h2>{new Date(day.date).toLocaleString('en-US', { weekday: 'long' })}</h2>
                  <p>{day.temp}°</p>
                  <p>{day.description}</p> 
                </div>
              ))}
            </div>

            <div className="recently-searched-container">
              <div className="recently-searched">
                {recentlySearched.map((location, index) => (
                  <div key={index} className="recently-searched-card">
                    <span>{location.name}</span>
                    <span>{location.temp}</span>
                    <span>{location.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;