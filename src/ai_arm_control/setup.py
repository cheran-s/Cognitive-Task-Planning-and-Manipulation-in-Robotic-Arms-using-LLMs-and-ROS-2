import os
from glob import glob
from setuptools import find_packages, setup

package_name = 'ai_arm_control'

def get_web_files():
    data_files = []
    for root, dirs, files in os.walk('web'):
        install_dir = os.path.join('share', package_name, root)
        file_paths = [os.path.join(root, f) for f in files]
        if file_paths:
            data_files.append((install_dir, file_paths))
    return data_files

setup(
    name=package_name,
    version='1.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        (os.path.join('share', package_name, 'launch'), glob('launch/*.launch.py')),
        *get_web_files()
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='Antigravity Robotics',
    maintainer_email='dev@antigravity.robotics',
    description='Natural Language AI Commander and Web-Based 3D Telemetry Dashboard for 6-DOF Industrial Arm',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'ai_commander = ai_arm_control.ai_commander:main',
            'web_server = ai_arm_control.web_server:main',
        ],
    },
)
