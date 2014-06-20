#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os 

for path, directories, files in os.walk('./src'):
    print 'ls %r' % path
    for directory in directories:
        print '    d%r' % directory
    for filename in files:
        print '    -%r' % filename