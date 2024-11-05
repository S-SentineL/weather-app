import React from 'react';
import { Line } from 'react-chartjs-2';

const UVIndexChart = ({ uvIndexData }) => {
  const data = {
    labels: uvIndexData.map(item => item.date),
    datasets: [
      {
        label: 'UV Index',
        data: uvIndexData.map(item => item.uvIndex),
        borderColor: 'rgba(255, 0, 0, 1)', // Red color for UV index
        backgroundColor: 'rgba(255, 0, 0, 0.2)', // Light red for background
        borderWidth: 2,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (tooltipItem) => `UV Index: ${tooltipItem.raw}`,
        },
      },
    },
  };

  return (
    <div>
      <h2>UV Index Chart</h2>
      {uvIndexData.length > 0 ? (
        <Line data={data} options={options} />
      ) : (
        <p>No UV Index data available.</p>
      )}
    </div>
  );
};

export default UVIndexChart;
