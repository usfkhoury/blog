---
title: "Yawmiyet Khebbez (Part 1): Khebez Arabe (Pita Bread) - الخبز العربي"
date: 2020-12-27T21:51:03Z
draft: false
categories: ["Yawmiyet Khebbez"]
type: "post"
math: true

---

## The Recipe
|							|                           | Experiment A 				| Experiment B 				|
| ------------------------- | ------------------------- | ------------------------- | ------------------------- |
|**Ingredients**			|**Total**					|**NA**      				|**NA**      				|
|							|White Flour    			|2.5 cups          			|2.5 cups          			|
|							|Brown Flour    			|0.5 cups         			|0.5 cups         			|
|							|Water						|1 cup   					|2 cups		  				|
|							|Sugar						|1 tbsp		   				|1 tbsp			  			|
|							|Olive Oil      			|1 tbsp          			|1 tbsp          			|
|							|Salt           			|1 tsp           			|1 tsp			  			|
|							|Yeast           			|2 tsp           			|2 tsp			  			|
|**Flour Type Distribution**|**Total**					|**NA**	   					|**NA**	  					|
|							|White Flour				|83%		   				|83%			  			|
|							|Brown Flour				|17%		   				|17%			  			|
|**Hydration Rate**			|							|**64%**	   				|**128%**		  			|
|**Oven Specs**				|							|
|							|Temperature				|Max Temp	   				|Max Temp	  				|
|							|Baking Time				|Until puff and a bit brown |Until puff and a bit brown |

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
* 1 cup = 250mL
* Water: 1 cup = 250g
* White Flour: 1 cup ~ 132g
* Brown Flour: 1 cup ~ 127g

TL;DR: The hydration rate can't be computed with volume measurements since 1 cup of water is not equivalent to 1 cup of flour.

If we take for example both experiment A and experiment B of the above pita bread recipe, and assume for simplicity that the weight of white flour and brown flour is the same, we get the below hydration rate calculations:
* Using Volume: \\( {\text{1 cup Water} \over \text{3 cups Flour}}*100=33\text{%} \\)

* Using Weight: \\( {\text{250g Water} \over 3*\text{132g Flour}}*100=63\text{%} \\)

Unfortunately, I had to learn this the hard way when trying to experiment with higher hydration rates for the pita bread recipe (experiment B). This is what happened:

The initial recipe (experiment A) was prepared using volume measurements, so I though I could compute the hydration rate with volume measurements 

