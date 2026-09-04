const express = require('express');

const router = express.Router();

const indices = [
  { name: 'NIFTY 50', baseValue: 24000 },
  { name: 'SENSEX', baseValue: 79000 },
  { name: 'BANK NIFTY', baseValue: 51000 },
  { name: 'NIFTY IT', baseValue: 35000 },
].map((index) => ({
  ...index,
  value: index.baseValue,
  changePercent: 0,
}));

router.get('/', (req, res) => {
  const result = indices.map((index) => {
    const movement = (Math.random() - 0.5) * 1;
    const nextValue = index.value * (1 + movement / 100);

    index.changePercent = movement;
    index.value = nextValue;

    return {
      name: index.name,
      value: Math.round(index.value * 100) / 100,
      changePercent: Math.round(index.changePercent * 100) / 100,
    };
  });

  res.json(result);
});

module.exports = router;
