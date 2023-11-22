---
title: "Yawmiyet Khebbez (Part 1): Khebez Arabe (Pita Bread) - الخبز العربي"
date: 2020-12-27T21:51:03Z
draft: false
categories: ["Yawmiyet Khebbez"]
type: "post"
math: true

---

## The Recipe

|  | Experiment A | Experiment B |
| --- | --- | --- |
| Ingredients | Total | NA |
|  | White Flour | 2.5 cups |
|  | Brown Flour | 0.5 cups |
|  | Water | 1 cup |
|  | Sugar | 1 tbsp |
|  | Olive Oil | 1 tbsp |
|  | Salt | 1 tsp |
|  | Yeast | 2 tsp |
| Flour Type Distribution | Total | NA |
|  | White Flour | 83% |
|  | Brown Flour | 17% |
| Hydration Rate |  | 63% |
| Oven Specs |  |  |
|  | Temperature | Max Temp |
|  | Baking Time | Until puff and a bit brown |

## The Timeline
{{< mermaid >}}
gantt
	dateFormat  DD-HH:mm
	axisFormat  Day%e-%I:%M
	title Khebez Arabe Timeline (~3h 45min)
	section Preparation
		Heat Water               :prep1, 01-08:00, 10m
		Mix Ingredients      	 :prep2, 01-08:00, 10m
		Check Yeast				 :prep3, after prep2, 10m
		Knead Dough				 :prep4, after prep3, 10m
	section Resting
		Rest				 	 :rest1, after prep4, 2h
	section Shaping
		Pre Shape				 :shape1, after rest1, 15m
		Final Shape				 :shape2, after shape1, 1h
	section Baking
		Baking				 	 :bake1, after shape1, 1h
{{< /mermaid >}}

## Notes

### Exploring Hydration Rates

Let's first define the below variables:

- 1 cup = 236mL
- Water: 1 cup = 250g
- White Flour: 1 cup ~ 132g
- Brown Flour: 1 cup ~ 127g

TL;DR: The hydration rate can't be computed with volume measurements since 1 cup of water is not equivalent to 1 cup of flour.

If we take for example both experiment A and experiment B of the above pita bread recipe, and assume for simplicity that the weight of white flour and brown flour is the same, we get the below hydration rate calculations:

- Using Volume: $\frac{\text{1 cup Water}}{\text{3 cups Flour}} * 100 = 33\%$
- Using Weight: $\frac{\text{250g Water}}{\text{3 * 132g Flour}} * 100 = 63\%$

Unfortunately, I had to learn this the hard way when trying to experiment with higher hydration rates for the pita bread recipe (experiment B). This is what happened:

The initial recipe (experiment A) was prepared using volume measurements, so I though I could compute the hydration rate with volume measurements which was computed to be 33% (as shown above). I then decided to experiment with a hydration rate of 60% by performing the following calculation to get the number of cups of water that I should use: 

$$
\frac{\text{x cup Water}}{\text{3 cups Flour}} = 60\% \Rightarrow x = 1.8 \approx  2\;cups\;Water
$$

So using the above calculation, the resulting dough was way too sticky and took forever to knead even after adding additional flour. After adding more flour gradually and kneading fo even more time, the final shaped dough was very delicate and teared constantly and easily while rolling, resulting in pitas that don't puff up as well in the oven.

After going through my calculations and redoing them using weight measurements instead of volume, the reason experiment B turned out like it did became apparent as seen in the new weight-based hydration rate:

- Experiment A: $\frac{\text{1 cup Water}}{\text{3 cups Flour}}*100 \Leftrightarrow \frac{\text{250g Water}}{\text{3 * 132g Flour}}*100 = 63\%$
- Experiment B: $\frac{\text{2 cup Water}}{\text{3 cups Flour}}*100 \Leftrightarrow \frac{\text{500g Water}}{3*\text{132g Flour}}*100 = 126\%$

So, it turned out that the original recipe (experiment A) was already 63% not 33% hydration, and I was experimenting (experiment B) with 126% hydration which is way too much for pita bread.

As a conclusion, you should always use weight measurements to compute hydration rates, and also, whenever you want to convert from weight to volume measurements and vice versa, make sure to note the density of the ingredient since $\rho = \frac{m}{V}$, so for example:

- For water, the density is $997kg/m^3$, so 1Kg of water is equivalent to $\frac{m}{\rho} = \frac{1kg}{997kg/m^3} = 0.001m^3 = 1L$
- For flour, the density is on average $0.593g/cm^3$, so 1Kg of water is equivalent to $\frac{m}{\rho} = \frac{1000g}{0.593g/cm^3} = 1686cm^3 = 1.686L$

Using the above density formula you can get a rough estimate on the volumetric to weight ratio of any ingredient. To note that, some variability will apply in the real world due to the hundreds of variables that could affect density, such as, humidity, temperature, flour type, whether you sift your flour or not, etc.

Using the above density formula you can get a rough estimate on the volumetric to weight ratio of any ingredient. To note that, some variability will apply in the real world due to the hundreds of variables that could affect density, such as, humidity, temperature, flour type, whether you sift your flour or not, etc.
