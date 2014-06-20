#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os 
import shutil

SOURCE_DIR = 'src'
BUILD_DIR = 'build'

SOURCE_PATH = os.path.join('.', SOURCE_DIR)
BUILD_PATH = os.path.join('.', BUILD_DIR)

try:
	shutil.rmtree(BUILD_PATH)
except OSError as e:
	pass

os.mkdir(BUILD_PATH)		# el directorio de destino

for path, directories, files in os.walk(SOURCE_PATH):
    print 'ls %r' % path
    for directory in directories:
        print '    d%r' % directory
    for filename in files:
        print '    -%r' % filename