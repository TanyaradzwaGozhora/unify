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

    df = pd.read_excel('Courses.xlsx')

    df.drop_duplicates(inplace=True)
    course_list = []
    random_courses = df.sample(n=3)

    arr = random_courses.to_numpy()

    for i in range(3):
        course_list.append(str(arr[i][0]) + str(arr[i][1]))
    
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

