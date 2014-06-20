#!/usr/bin/env python
# -*- coding: utf-8 -*-

from slimit import minify
from gas_slimmer import *
import rcssmin
import subprocess

MEDIA_JS_PATH = './static/js/'
MEDIA_JS_OUPUT = './static/js/min/'
MEDIA_JS_EXTERN = './static/js/extern/'
MEDIA_JS_LIBS = './static/js/libs/'


# for target in MEDIA_JS:
# 	scripts = MEDIA_JS[target]
# 	print scripts
# 	source = ""
# 	for s in scripts['src']:
# 		source += open(MEDIA_JS_PATH+s, 'r').read()+"\n"
# 	output = open(MEDIA_JS_OUPUT+target, 'w+')
# 	output.write(minify(source))
# 	output.close()

for target in MEDIA_JS:
	scripts = MEDIA_JS[target]
	print scripts
	params = []
	for s in scripts['src']:
		params += ['--js', MEDIA_JS_PATH+s]
	for s in scripts['libs']:
		params += ['--js', MEDIA_JS_LIBS+s]
	# for x in scripts['extern']:
	# 	params += ['--externs', MEDIA_JS_EXTERN+x]
	params += ['--js_output_file', MEDIA_JS_OUPUT+target]
	# subprocess.call(['java', '-jar' ,'./closure/compiler.jar',
	# 	'--compilation_level', 'ADVANCED_OPTIMIZATIONS'] + params)
	subprocess.call(['java', '-jar' ,'./closure/compiler.jar'] + params)
