from faker import Faker
import pandas as pd
import random
fake = Faker()
import json


def create_rows():
    output = [{ 
                "courses": courses(),
                "googleId": googleId(),
                "_v": 0,
                "discordName": fake.name().split(' ', 1)[0] + "#" + str(random.randint(1000,9999)),
                "preferredName":fake.name().split(' ', 1)[0]} for x in range(100)]
    return output


def courses():
    existing = ['MATH','ECON','CMPUT','STAT','SOC','ASTRO','ENGL','BUS','MUS']
    course_list = []
    for i in range(3):
        course_list.append(str(random.choice(existing) + str(random.randint(100,499))))
    
    return course_list

def googleId():
    
    number = "1"
    number += str(random.randint(100000,500000))
    number += str(random.randint(100000,500000))
    number += str(random.randint(100000,500000))
    number += str(random.randint(100000,500000))

    return number

dict = create_rows()
with open("sample.json", "w") as outfile: 
    json.dump(dict, outfile)

