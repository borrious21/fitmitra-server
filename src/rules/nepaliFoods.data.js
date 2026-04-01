// src/data/nepaliFoods.data.js

export const NEPALI_FOODS = {
  breakfast: [
    {
      name: "Chiura + Dahi",
      macros: { protein: 8, carbs: 45, fats: 5 },
      tags: ["vegetarian", "diabetes_friendly", "balanced"]
    },
    {
      name: "Vegetable Omelette + Roti",
      macros: { protein: 18, carbs: 30, fats: 12 },
      tags: ["high_protein"]
    },
    {
      name: "Masala Oats + Nuts",
      macros: { protein: 12, carbs: 35, fats: 10 },
      tags: ["vegetarian", "heart_friendly", "balanced"]
    },
    {
      name: "Sweet Tea + White Bread",
      macros: { protein: 6, carbs: 55, fats: 8 },
      tags: ["high_carb"]
    }
  ],

  lunch: [
    {
      name: "Dal Bhat Tarkari",
      macros: { protein: 22, carbs: 70, fats: 15 },
      tags: ["balanced", "traditional", "vegetarian"]
    },
    {
      name: "Brown Rice + Lentils + Saag",
      macros: { protein: 25, carbs: 60, fats: 10 },
      tags: ["diabetes_friendly", "vegetarian", "heart_friendly"]
    },
    {
      name: "Chicken Curry + Rice",
      macros: { protein: 30, carbs: 65, fats: 20 },
      tags: ["high_protein", "high_fat"]
    }
  ],

  dinner: [
    {
      name: "Roti + Tarkari",
      macros: { protein: 15, carbs: 45, fats: 8 },
      tags: ["light", "vegetarian"]
    },
    {
      name: "Vegetable Soup + Roti",
      macros: { protein: 10, carbs: 35, fats: 6 },
      tags: ["heart_friendly", "light", "vegetarian"]
    },
    {
      name: "Paneer Bhurji + Roti",
      macros: { protein: 24, carbs: 28, fats: 18 },
      tags: ["high_protein", "vegetarian", "high_fat"]
    }
  ]
};
