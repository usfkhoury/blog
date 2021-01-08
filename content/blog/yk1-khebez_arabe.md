---
title: "Yawmiyet Khebbez (Part 1): Khebez Arabe (Pita Bread) - الخبز العربي"
date: 2020-12-27T21:51:03Z
draft: false
categories: ["Yawmiyet Khebbez"]
type: "post"
---

## The Recipe

The table will include the below basic properties, as well as any other miscellaneous notes:
+ Ingredient measurements by weight and volume, although weight measurements are preferred **(explanation comming soon)**, both metrics will be listed
+ Hydration rate of the dough **(explanation comming soon)**
+ Flour type distrbution, if multiple types of flour are used
+ Oven baking specifications, including: temperature, steam, baking time, etc.

For instance, this would be an example of a table for a recipe where I experimented with two different hydration levels:
| | Experiment 1 | Experiment 2 |
|-| ------- | ------- |
|**Ingredients**|**696g**|**696g**|
|White Flour|274g|274g|
|Brown Flour|134g|134g|
|Water|250g|300g|
|Sugar|13g|13g|
|Olive Oil|17g|17g|
|Salt|8g|8g|
|**Flour Type Distribution**|**408g**|**408g**|
|White Flour|67%|67%|
|Brown Flour|33%|33%|
|**Hydration Rate**|**61%**|**73%**|
|**Oven Specs**|||
|Temperature|200&deg;C|200&deg;C|
|Steam|Yes|No|
|Baking Time|30-40 minutes|30-40 minutes|

Following the above mentioned table, the post will proceed by listing a high level breakdown of the recipe, formated as a gantt chart, showing the typical progression of the recipe progression.
This chart would look something like this:

{{< mermaid >}}
gantt
	dateFormat  DD-HH:mm
	axisFormat  Day%e-%I:%M
	title Example Bread Timeline
	section Preparation
		Heat Water               :prep1, 01-08:00, 10m
		Mix Ingredients      	 :prep2, 01-08:00, 10m
		Check Yeast				 :prep3, after prep2, 10m
		Knead Dough				 :prep4, after prep3, 10m
	section Resting
		First Rest				 :rest1, after prep4, 2h
		Second Rest				 :rest2, after shape2, 1h
	section Shaping
		Pre Shape				 :shape1, after rest1, 30m
		Final Shape				 :shape2, after shape1, 10m
	section Baking
		Baking				 	 :bake1, after rest2, 1h
{{< /mermaid >}}

And finally, the post will include any notes that I have on each experiment and on the recipe in general.